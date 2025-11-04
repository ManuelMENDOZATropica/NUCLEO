import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { createSign, randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

import pdfParse from "../utils/pdfParse.js";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const FRONTEND_PROMPT_PATH = path.join(
  PROJECT_ROOT,
  "frontend",
  "public",
  "Documents",
  "BriefBuddy",
  "prompt_context.txt"
);
const TEMPLATE_DOC_PATH = path.join(
  PROJECT_ROOT,
  "frontend",
  "public",
  "Documents",
  "BriefBuddy",
  "brief template.docx"
);

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_DRIVE_FOLDER = "1kuf5eNjWce1d7yNGjvEm7n0FAR44hO5k";
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_DIRECT_TEXT_LENGTH = 20000;
export const MAX_CHUNK_LENGTH = 12000;
export const CHUNK_OVERLAP = 800;
export const MAX_NOTES_PER_SECTION = 8;
const MAX_NOTE_LENGTH = 400;
const MAX_AGGREGATED_MISSINGS = 30;
const MAX_FINAL_OUTPUT_TOKENS = 3072;

const NOTE_SECTION_KEYS = [
  "project",
  "challenge",
  "strategy",
  "creative",
  "architecture",
  "appendix",
  "ecosystem",
  "promotion",
  "media",
  "production",
];

const NOTE_SECTION_LABELS = {
  project: "Proyecto",
  challenge: "Desafío",
  strategy: "Estrategia",
  creative: "Creativo",
  architecture: "Arquitectura",
  appendix: "Apéndice",
  ecosystem: "Ecosistema",
  promotion: "Promoción",
  media: "Medios",
  production: "Producción",
};

async function loadContext() {
  try {
    return await fs.readFile(FRONTEND_PROMPT_PATH, "utf8");
  } catch (error) {
    console.warn(
      `No se pudo leer el archivo de contexto en ${FRONTEND_PROMPT_PATH}. Se usará un contexto vacío.`,
      error
    );
    return "";
  }
}

function normalizeMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map(msg => {
      if (!msg || typeof msg !== "object") return null;
      const role = msg.role === "assistant" ? "model" : msg.role;
      if (role !== "user" && role !== "model") return null;
      const content = typeof msg.content === "string" ? msg.content.trim() : "";
      if (!content) return null;
      return { role, parts: [{ text: content }] };
    })
    .filter(Boolean);
}

function truncateWithEllipsis(text, maxLength) {
  if (typeof text !== "string") return "";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
}

function limitPromptBlock(value, limit) {
  if (typeof value !== "string") return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

export function splitTextIntoChunks(text, chunkLength = MAX_CHUNK_LENGTH, overlap = CHUNK_OVERLAP) {
  if (typeof text !== "string") {
    return [];
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  if (normalized.length <= chunkLength) {
    return [normalized];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkLength, normalized.length);

    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n\n", end);
      if (paragraphBreak > start + 2000) {
        end = paragraphBreak + 2;
      } else {
        const sentenceBreak = normalized.lastIndexOf(". ", end);
        if (sentenceBreak > start + 2000) {
          end = sentenceBreak + 2;
        }
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    const nextStart = Math.max(end - overlap, start + 1);
    start = nextStart;
  }

  return chunks;
}

function createEmptySectionNotes() {
  return NOTE_SECTION_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

export function mergeSectionNotes(targetNotes, sourceNotes = {}) {
  const merged = targetNotes ? { ...targetNotes } : createEmptySectionNotes();

  for (const key of NOTE_SECTION_KEYS) {
    if (!Array.isArray(merged[key])) {
      merged[key] = [];
    }

    const incoming = Array.isArray(sourceNotes?.[key]) ? sourceNotes[key] : [];
    for (const note of incoming) {
      const normalized = truncateWithEllipsis(note, MAX_NOTE_LENGTH);
      if (!normalized) continue;
      if (merged[key].includes(normalized)) continue;
      if (merged[key].length >= MAX_NOTES_PER_SECTION) continue;
      merged[key].push(normalized);
    }
  }

  return merged;
}

function notesHaveContent(notes) {
  return NOTE_SECTION_KEYS.some(key => Array.isArray(notes?.[key]) && notes[key].length > 0);
}

function formatNotesForPrompt(notes) {
  return NOTE_SECTION_KEYS.map(key => {
    const label = NOTE_SECTION_LABELS[key] || key;
    const items = Array.isArray(notes?.[key]) ? notes[key] : [];
    if (items.length === 0) {
      return `### ${label}\n- (sin datos)`;
    }

    const bulletList = items.map(item => `- ${item}`).join("\n");
    return `### ${label}\n${bulletList}`;
  }).join("\n\n");
}

function addMissingQuestions(store, questions) {
  const target = store instanceof Set ? store : new Set();
  if (!Array.isArray(questions)) {
    return target;
  }

  for (const question of questions) {
    const normalized = truncateWithEllipsis(question, MAX_NOTE_LENGTH);
    if (!normalized) continue;
    if (target.size >= MAX_AGGREGATED_MISSINGS && target.has(normalized)) {
      continue;
    }
    target.add(normalized);
    if (target.size > MAX_AGGREGATED_MISSINGS) {
      const limited = Array.from(target).slice(0, MAX_AGGREGATED_MISSINGS);
      target.clear();
      for (const item of limited) {
        target.add(item);
      }
      break;
    }
  }

  return target;
}

function formatMissingQuestions(questions) {
  if (!questions || questions.length === 0) {
    return "No se detectaron preguntas pendientes en las notas previas.";
  }

  const bullets = questions.map(question => `- ${question}`).join("\n");
  return `Preguntas pendientes detectadas hasta ahora:\n${bullets}`;
}

function appendSummary(summaries, summary) {
  if (!Array.isArray(summaries)) {
    return [];
  }

  const normalized = truncateWithEllipsis(summary, MAX_NOTE_LENGTH * 2);
  if (!normalized) {
    return summaries;
  }

  summaries.push(normalized);
  return summaries;
}

function formatChunkSummaries(summaries) {
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return "";
  }

  return summaries
    .map((summary, index) => `Fragmento ${index + 1}: ${summary}`)
    .join("\n\n");
}

export class GeminiResponseError extends Error {
  constructor(message, { statusCode = 500, code, details } = {}) {
    super(message);
    this.name = "GeminiResponseError";
    this.statusCode = statusCode;
    if (code) this.code = code;
    if (details) this.details = details;
  }
}

export async function executeGeminiRequest({ contents, temperature = 0.7, maxOutputTokens = 1024 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  const context = await loadContext();
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  let effectiveContents = Array.isArray(contents) ? contents.filter(Boolean) : [];
  if (effectiveContents.length === 0) {
    effectiveContents = [
      {
        role: "user",
        parts: [
          {
            text: "Inicia la conversación siguiendo las instrucciones de MELISA y BriefBuddy.",
          },
        ],
      },
    ];
  }

  const body = {
    contents: effectiveContents,
    systemInstruction: {
      parts: [{ text: context }],
    },
    generationConfig: {
      temperature,
      topP: 0.9,
      topK: 40,
      maxOutputTokens,
    },
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error de Gemini (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const promptFeedback = json?.promptFeedback;

  if (promptFeedback?.blockReason) {
    const blockReason = promptFeedback.blockReason;
    const blockMessages = {
      SAFETY:
        "Gemini rechazó el PDF por políticas de seguridad. Revisa que el documento cumpla con las políticas de contenido y vuelve a intentarlo.",
      BLOCK_REASON_UNSPECIFIED:
        "Gemini no pudo procesar el PDF por un motivo no especificado. Intenta con un documento diferente o revisa su contenido.",
    };

    const message =
      blockMessages[blockReason] ||
      "Gemini no pudo procesar el PDF por un problema con el contenido enviado.";

    throw new GeminiResponseError(message, {
      statusCode: 422,
      code: `GEMINI_PROMPT_BLOCKED_${blockReason}`,
      details: { blockReason },
    });
  }

  const candidates = json.candidates || [];
  const primary = candidates[0];
  const safetyRatings = [
    ...(Array.isArray(promptFeedback?.safetyRatings) ? promptFeedback.safetyRatings : []),
    ...(Array.isArray(primary?.safetyRatings) ? primary.safetyRatings : []),
  ];

  const blockedSafetyRating = safetyRatings.find(rating => rating?.blocked);

  if (blockedSafetyRating) {
    throw new GeminiResponseError(
      "Gemini bloqueó el contenido del PDF por políticas de seguridad. Revisa el documento e inténtalo nuevamente.",
      {
        statusCode: 422,
        code: `GEMINI_SAFETY_${blockedSafetyRating.category || "BLOCKED"}`,
        details: {
          category: blockedSafetyRating.category,
          probability: blockedSafetyRating.probability,
        },
      }
    );
  }

  if (!primary) {
    throw new GeminiResponseError(
      "Gemini no devolvió candidatos para procesar el PDF. Intenta nuevamente más tarde.",
      { statusCode: 502, code: "GEMINI_NO_CANDIDATES" }
    );
  }

  if (primary.finishReason === "SAFETY") {
    throw new GeminiResponseError(
      "Gemini detuvo la respuesta por políticas de seguridad. Revisa el contenido del PDF y vuelve a intentarlo.",
      { statusCode: 422, code: "GEMINI_FINISH_SAFETY" }
    );
  }

  if (primary.finishReason === "MAX_TOKENS") {
    throw new GeminiResponseError(
      "El PDF es demasiado largo y superó el límite de tokens permitido por Gemini. Reduce el documento e inténtalo nuevamente.",
      {
        statusCode: 413,
        code: "GEMINI_MAX_TOKENS",
        details: { finishReason: primary.finishReason },
      }
    );
  }

  const contentParts = Array.isArray(primary?.content?.parts) ? primary.content.parts : [];

  if (contentParts.length === 0) {
    throw new GeminiResponseError(
      "No pudimos leer texto aprovechable del PDF. Asegúrate de que el archivo contenga texto legible (no solo imágenes o escaneos) y vuelve a intentarlo.",
      {
        statusCode: 422,
        code: "GEMINI_EMPTY_CONTENT",
        details: { finishReason: primary.finishReason || null },
      }
    );
  }

  const textParts = contentParts
    .map(part => (typeof part.text === "string" ? part.text : ""))
    .filter(text => text.trim().length > 0)
    .join("")
    .trim();

  if (!textParts) {
    throw new GeminiResponseError(
      "Gemini no encontró información aprovechable en el PDF. Verifica el documento y vuelve a intentarlo.",
      {
        statusCode: 422,
        code: "GEMINI_NO_TEXT_PARTS",
        details: { finishReason: primary.finishReason || null },
      }
    );
  }

  return { text: textParts, raw: json };
}

async function callGemini({ messages, extraPrompt, temperature = 0.7, maxOutputTokens = 1024 }) {
  const contents = normalizeMessages(messages);
  if (extraPrompt) {
    contents.push({ role: "user", parts: [{ text: extraPrompt }] });
  }

  return executeGeminiRequest({ contents, temperature, maxOutputTokens });
}

function findNextSignificantChar(str, startIndex) {
  for (let i = startIndex; i < str.length; i += 1) {
    const char = str[i];
    if (!char || /\s/.test(char)) continue;
    return { index: i, char };
  }
  return null;
}

function escapeUnescapedQuotes(candidate) {
  let inString = false;
  let escaping = false;
  let repaired = "";

  for (let i = 0; i < candidate.length; i += 1) {
    const char = candidate[i];

    if (char === "\\" && !escaping) {
      escaping = true;
      repaired += char;
      continue;
    }

    if (char === "\"" && !escaping) {
      if (!inString) {
        inString = true;
        repaired += char;
        continue;
      }

      const next = findNextSignificantChar(candidate, i + 1);

      if (!next || next.char === "}" || next.char === "]" || next.char === ":") {
        inString = false;
        repaired += char;
        continue;
      }

      if (next.char === ",") {
        const afterComma = findNextSignificantChar(candidate, next.index + 1);
        if (afterComma && (afterComma.char === "}" || afterComma.char === "]" || afterComma.char === "\"")) {
          inString = false;
          repaired += char;
          continue;
        }
      }

      repaired += "\\\"";
      continue;
    }

    if (char === "\"" && escaping) {
      escaping = false;
      repaired += char;
      continue;
    }

    if (escaping) {
      escaping = false;
    }

    repaired += char;
  }

  return repaired;
}

function repairJsonString(candidate) {
  let repaired = candidate
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  repaired = repaired.replace(/,\s*(?=[}\]])/g, match => match.replace(",", ""));

  repaired = repaired.replace(/(^|[,{\[]\s*)'([^']+?)'\s*:/g, (_, prefix, key) => `${prefix}"${key}":`);
  repaired = repaired.replace(/:\s*'([^']*?)'/g, (_, value) => `: "${value.replace(/"/g, '\\"')}"`);

  repaired = escapeUnescapedQuotes(repaired);

  return repaired;
}

function tryParseCandidate(candidate) {
  try {
    return JSON.parse(candidate);
  } catch (firstError) {
    try {
      const repaired = repairJsonString(candidate);
      return JSON.parse(repaired);
    } catch (secondError) {
      throw secondError instanceof Error ? secondError : firstError;
    }
  }
}

export function extractJsonBlock(text) {
  if (!text || typeof text !== "string") {
    throw new GeminiResponseError("No se recibió una respuesta en formato JSON.", {
      statusCode: 422,
      code: "GEMINI_INVALID_JSON",
    });
  }

  const candidates = [];
  const jsonStart = text.indexOf("```");
  if (jsonStart !== -1) {
    const afterStart = text.slice(jsonStart + 3);
    const secondFence = afterStart.indexOf("```");
    if (secondFence !== -1) {
      const fenced = afterStart.slice(0, secondFence).replace(/^json\n?/i, "");
      candidates.push(fenced.trim());
    }
  }

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    candidates.push(text.slice(braceStart, braceEnd + 1));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = tryParseCandidate(candidate);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }

  throw new GeminiResponseError(
    "Gemini devolvió un JSON inválido que no se pudo reparar.",
    { statusCode: 422, code: "GEMINI_INVALID_JSON" }
  );
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphXml(text, { bold = false } = {}) {
  const safeText = escapeXml(text);
  return `\n    <w:p>\n      <w:r>${bold ? "\n        <w:rPr><w:b/></w:rPr>" : ""}\n        <w:t xml:space=\"preserve\">${safeText}</w:t>\n      </w:r>\n    </w:p>`;
}

function buildDocumentXml(data, templateXml) {
  const headerMatch = templateXml.match(/<w:document[^>]*>/);
  const prefixMatch = templateXml.match(/^<\?xml[^>]+>/);
  const sectPrMatch = templateXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);

  const prefix = prefixMatch ? prefixMatch[0] : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const documentOpen = headerMatch ? headerMatch[0] :
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';
  const sectPr = sectPrMatch ? sectPrMatch[0] :
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';

  const paragraphs = [];
  const addSection = (title, content) => {
    if (!content) return;
    paragraphs.push(paragraphXml(title, { bold: true }));
    if (Array.isArray(content)) {
      content.forEach(item => {
        if (!item) return;
        if (typeof item === "string") {
          paragraphs.push(paragraphXml(item));
        } else if (item && typeof item === "object") {
          Object.entries(item).forEach(([key, value]) => {
            if (!value) return;
            paragraphs.push(paragraphXml(`${key}: ${value}`));
          });
        }
      });
    } else if (typeof content === "object") {
      Object.entries(content).forEach(([key, value]) => {
        if (!value) return;
        if (Array.isArray(value)) {
          paragraphs.push(paragraphXml(`${key}:`));
          value.forEach(v => paragraphs.push(paragraphXml(`• ${v}`)));
        } else {
          paragraphs.push(paragraphXml(`${key}: ${value}`));
        }
      });
    } else {
      paragraphs.push(paragraphXml(content));
    }
  };

  const project = data.project || {};
  const challenge = data.challenge || {};
  const strategy = data.strategy || {};
  const creative = data.creative || {};
  const architecture = data.architecture || {};
  const appendix = data.appendix || {};
  const ecosystem = data.ecosystem || {};
  const promotion = data.promotion || {};
  const media = data.media || {};
  const production = data.production || {};
  const summary = data.summary || [];
  const pending = data.pending || [];

  paragraphs.push(paragraphXml("Mercado Ads Brief", { bold: true }));

  addSection("Proyecto", [
    project.name ? `Nombre del proyecto: ${project.name}` : null,
    project.brand ? `Marca: ${project.brand}` : null,
    project.country ? `País: ${project.country}` : null,
    project.language ? `Idioma: ${project.language}` : null,
    project.meliLead ? `Responsable MeLi: ${project.meliLead}` : null,
    project.brandLead ? `Responsable marca: ${project.brandLead}` : null,
    project.type ? `Tipo de brief: ${project.type}` : null,
    project.timeline ? `Timing objetivo: ${project.timeline}` : null,
  ]);

  addSection("1. The Challenge", [
    challenge.context && `Contexto de negocio: ${challenge.context}`,
    challenge.tweet && `Brief en un tuit: ${challenge.tweet}`,
    challenge.metrics && {
      Primary: challenge.metrics.primary,
      Secondary: challenge.metrics.secondary,
      Comercio: challenge.metrics.commerce,
      Marca: challenge.metrics.brand,
      Engagement: challenge.metrics.engagement,
    },
  ]);

  addSection("2. Strategic Foundation", [
    strategy.target && `Target audience: ${strategy.target}`,
    strategy.insight && `Key consumer insight: ${strategy.insight}`,
    strategy.brandTruth && `Brand truth: ${strategy.brandTruth}`,
    strategy.culturalContext && `Cultural context: ${strategy.culturalContext}`,
    strategy.competitors && `Competencia clave: ${strategy.competitors}`,
    strategy.differentiation && `Diferenciación competitiva: ${strategy.differentiation}`,
  ]);

  if (Object.keys(creative).length) {
    addSection("3. Creative Strategy", [
      creative.concept && `Creative concept: ${creative.concept}`,
      creative.keyMessage && `Key message: ${creative.keyMessage}`,
      creative.emotionalTerritory && `Emotional territory: ${creative.emotionalTerritory}`,
    ]);
  }

  if (Object.keys(architecture).length) {
    addSection("4. Campaign Architecture", [
      architecture.tagline && `Campaign tagline/theme: ${architecture.tagline}`,
      architecture.contentPillars && `Content pillars: ${architecture.contentPillars}`,
    ]);
  }

  addSection("5. Appendix - Archivos", [
    appendix.mandatory && appendix.mandatory.length
      ? { "Para todos": appendix.mandatory.join(", ") }
      : null,
    appendix.optional && appendix.optional.length
      ? { "Opcionales": appendix.optional.join(", ") }
      : null,
    appendix.links && appendix.links.length
      ? { Links: appendix.links.join(" | ") }
      : null,
  ]);

  addSection("6. Integración Ecosistema MeLi", [
    ecosystem.opportunities && ecosystem.opportunities.length
      ? ecosystem.opportunities.join(", ")
      : ecosystem.opportunities,
    ecosystem.notes && `Notas: ${ecosystem.notes}`,
  ]);

  addSection("7. Mecánicas promocionales", [
    promotion.mechanics && promotion.mechanics.length
      ? promotion.mechanics.join(", ")
      : promotion.mechanics,
    promotion.details && `Detalles: ${promotion.details}`,
  ]);

  addSection("8. Ecosistema de medios", [
    media.core && media.core.length ? `Core formats: ${media.core.join(", ")}` : media.core,
    media.amplification && media.amplification.length
      ? `Amplificación: ${media.amplification.join(", ")}`
      : media.amplification,
  ]);

  addSection("9. Consideraciones de producción", [
    production.timeline && `Timeline: ${production.timeline}`,
    production.budget && `Presupuesto: ${production.budget}`,
    production.assets && `Assets requeridos: ${production.assets}`,
    production.notes && `Notas adicionales: ${production.notes}`,
  ]);

  if (summary && summary.length) {
    addSection("Resumen", summary);
  }

  if (pending && pending.length) {
    addSection("Pendientes", pending);
  }

  const bodyXml = `<w:body>${paragraphs.join("")}\n    ${sectPr}\n  </w:body>`;
  return `${prefix}\n${documentOpen}\n${bodyXml}\n</w:document>`;
}

async function generateDocumentBuffer(data) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "brief-buddy-"));
  const workDir = path.join(tmpDir, randomUUID());
  await fs.mkdir(workDir);

  try {
    await execFileAsync("unzip", ["-q", TEMPLATE_DOC_PATH, "-d", workDir]);

    const documentPath = path.join(workDir, "word", "document.xml");
    const templateXml = await fs.readFile(documentPath, "utf8");
    const newXml = buildDocumentXml(data, templateXml);
    await fs.writeFile(documentPath, newXml, "utf8");

    const outputPath = path.join(tmpDir, `BriefBuddy-${Date.now()}.docx`);
    await execFileAsync("zip", ["-qr", outputPath, "."], { cwd: workDir });
    const buffer = await fs.readFile(outputPath);
    return buffer;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function buildMultipartBody(metadata, fileBuffer, boundary) {
  const base64 = fileBuffer.toString("base64");
  const lines = [];
  lines.push(`--${boundary}`);
  lines.push("Content-Type: application/json; charset=UTF-8");
  lines.push("");
  lines.push(JSON.stringify(metadata));
  lines.push(`--${boundary}`);
  lines.push(
    "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(base64);
  lines.push(`--${boundary}--`);
  lines.push("");
  return lines.join("\r\n");
}

async function getServiceAccountToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !privateKey) {
    throw new Error("Credenciales de Google Drive no configuradas");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = obj => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const key = privateKey.replace(/\\n/g, "\n");
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al obtener token de Google: ${errorText}`);
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new Error("Respuesta de Google sin access_token");
  }
  return json.access_token;
}

async function uploadToDrive(buffer, filename) {
  const folderId = process.env.BRIEF_BUDDY_DRIVE_FOLDER || DEFAULT_DRIVE_FOLDER;
  const token = await getServiceAccountToken();
  const boundary = `brief_boundary_${Date.now()}`;

  const metadata = {
    name: filename,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    parents: [folderId],
  };

  const body = buildMultipartBody(metadata, buffer, boundary);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al subir a Drive: ${errorText}`);
  }

  const json = await response.json();
  return json;
}

export async function chatWithBriefBuddy(req, res) {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const { text, raw } = await callGemini({ messages });
    res.json({ reply: text, raw });
  } catch (error) {
    console.error("Error en chat BriefBuddy", error);
    res.status(500).json({ message: error.message || "Error interno" });
  }
}

export async function finalizeBrief(req, res) {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    if (messages.length === 0) {
      return res.status(400).json({ message: "Se requieren mensajes para finalizar" });
    }

    const summaryPrompt = `Genera un JSON estructurado con el brief completo siguiendo este esquema:
{
  "project": {
    "name": "string",
    "brand": "string",
    "country": "string",
    "language": "string",
    "meliLead": "string",
    "brandLead": "string",
    "type": "string",
    "timeline": "string"
  },
  "challenge": {
    "context": "string",
    "tweet": "string",
    "metrics": {
      "primary": "string",
      "secondary": "string",
      "commerce": ["string"],
      "brand": ["string"],
      "engagement": ["string"]
    }
  },
  "strategy": {
    "target": "string",
    "insight": "string",
    "brandTruth": "string",
    "culturalContext": "string",
    "competitors": "string",
    "differentiation": "string"
  },
  "creative": {
    "concept": "string",
    "keyMessage": "string",
    "emotionalTerritory": "string"
  },
  "architecture": {
    "tagline": "string",
    "contentPillars": "string"
  },
  "appendix": {
    "mandatory": ["string"],
    "optional": ["string"],
    "links": ["string"]
  },
  "ecosystem": {
    "opportunities": ["string"],
    "notes": "string"
  },
  "promotion": {
    "mechanics": ["string"],
    "details": "string"
  },
  "media": {
    "core": ["string"],
    "amplification": ["string"]
  },
  "production": {
    "timeline": "string",
    "budget": "string",
    "assets": "string",
    "notes": "string"
  },
  "summary": ["string"],
  "pending": ["string"]
}
Devuelve únicamente el JSON válido sin explicaciones adicionales.`;

    const { text } = await callGemini({ messages, extraPrompt: summaryPrompt, temperature: 0.4 });
    const structured = extractJsonBlock(text);

    const buffer = await generateDocumentBuffer(structured);
    const filename = structured.project?.name
      ? `${structured.project.name}-BriefBuddy.docx`
      : `BriefBuddy-${Date.now()}.docx`;

    const uploadInfo = await uploadToDrive(buffer, filename);
    res.json({
      message: "Brief completado y enviado",
      fileId: uploadInfo.id,
      fileName: uploadInfo.name,
      structured,
    });
  } catch (error) {
    console.error("Error al finalizar BriefBuddy", error);
    const statusCode =
      typeof error?.statusCode === "number"
        ? error.statusCode
        : typeof error?.status === "number"
        ? error.status
        : 500;

    const responseBody = { message: error.message || "Error interno" };

    if (error?.code) {
      responseBody.code = error.code;
    }

    if (error?.details) {
      responseBody.details = error.details;
    }

    res.status(statusCode).json(responseBody);
  }
}

export async function prefillBriefFromPdf(req, res) {
  try {
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName : "Documento";
    const rawData = typeof req.body?.fileData === "string" ? req.body.fileData : "";
    const providedText = typeof req.body?.extractedText === "string" ? req.body.extractedText : "";
    const trimmedText = providedText.trim();

    if (!trimmedText && !rawData) {
      return res
        .status(400)
        .json({ message: "Se requiere el texto extraído del PDF o el archivo en formato base64" });
    }

    if (providedText && !trimmedText) {
      return res.status(422).json({ message: "El texto extraído proporcionado está vacío" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada");
    }

    let extractedText = trimmedText;

    if (!extractedText) {
      const commaIndex = rawData.indexOf(",");
      const base64Payload = (commaIndex !== -1 ? rawData.slice(commaIndex + 1) : rawData).trim();
      let buffer;
      try {
        buffer = Buffer.from(base64Payload, "base64");
      } catch (error) {
        return res.status(400).json({ message: "No se pudo decodificar el archivo proporcionado" });
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ message: "El archivo está vacío" });
      }

      if (buffer.length > MAX_PDF_BYTES) {
        return res.status(400).json({ message: "El PDF supera el tamaño máximo permitido (8 MB)" });
      }

      const signature = buffer.slice(0, 4).toString("utf8");
      if (!signature.includes("%PDF")) {
        return res.status(400).json({ message: "El archivo proporcionado no parece ser un PDF válido" });
      }

      const { text } = await pdfParse(buffer);

      if (!text) {
        throw new GeminiResponseError(
          "No pudimos extraer texto utilizable del PDF. Verifica que el documento contenga texto seleccionable u ofrece una versión con OCR.",
          {
            statusCode: 422,
            code: "PDF_PARSE_EMPTY",
          }
        );
      }

      extractedText = text;
    }

    const truncatedText = extractedText.length > 80000
      ? `${extractedText.slice(0, 80000)}\n\n[Texto truncado tras 80.000 caracteres]`
      : extractedText;

    const sanitizedName = fileName.replace(/[\r\n]+/g, " ").trim();
    const truncatedName = sanitizedName.length > 160 ? `${sanitizedName.slice(0, 157)}...` : sanitizedName;
    const safeName = truncatedName.replace(/["`]/g, "'") || "Documento";
    const baseInstructions = `Analiza el contenido textual extraído del PDF titulado "${safeName}". Debes:
- Extraer la mayor cantidad posible de información relevante para completar un brief de Mercado Ads siguiendo la estructura oficial.
- Mantener los datos en el idioma en el que aparezcan y evitar inventar información.
- Cuando no exista información suficiente para responder a una sección o pregunta, deja el campo vacío y registra la pregunta pendiente correspondiente.

Devuelve exclusivamente un JSON válido con esta forma:
{
  "assistantMessage": "string",
  "prefilled": {
    "project": {
      "name": "string",
      "brand": "string",
      "country": "string",
      "language": "string",
      "meliLead": "string",
      "brandLead": "string",
      "type": "string",
      "timeline": "string"
    },
    "challenge": {
      "context": "string",
      "tweet": "string",
      "metrics": {
        "primary": "string",
        "secondary": "string",
        "commerce": ["string"],
        "brand": ["string"],
        "engagement": ["string"]
      }
    },
    "strategy": {
      "target": "string",
      "insight": "string",
      "brandTruth": "string",
      "culturalContext": "string",
      "competitors": "string",
      "differentiation": "string"
    },
    "creative": {
      "concept": "string",
      "keyMessage": "string",
      "emotionalTerritory": "string"
    },
    "architecture": {
      "tagline": "string",
      "contentPillars": "string"
    },
    "appendix": {
      "mandatory": ["string"],
      "optional": ["string"],
      "links": ["string"]
    },
    "ecosystem": {
      "opportunities": ["string"],
      "notes": "string"
    },
    "promotion": {
      "mechanics": ["string"],
      "details": "string"
    },
    "media": {
      "core": ["string"],
      "amplification": ["string"]
    },
    "production": {
      "timeline": "string",
      "budget": "string",
      "assets": "string",
      "notes": "string"
    }
  },
  "missingQuestions": ["string"]
}

El campo "assistantMessage" debe ser un mensaje en español y con tono cálido de MELISA que:
- Resuma los hallazgos clave organizados por secciones.
- Aclare qué preguntas siguen pendientes o necesitan más detalle usando viñetas.
- Invite a la persona usuaria a completar la información faltante.

No incluyas texto adicional fuera del JSON.`;

    const chunkTexts = splitTextIntoChunks(truncatedText, MAX_CHUNK_LENGTH, CHUNK_OVERLAP);
    const shouldUseChunking = chunkTexts.length > 1 || truncatedText.length > MAX_DIRECT_TEXT_LENGTH;
    let finalResponseText = "";
    let aggregatedMissing = new Set();

    if (!shouldUseChunking) {
      const directContents = [
        {
          role: "user",
          parts: [
            { text: baseInstructions },
            { text: `Contenido extraído del PDF:\n\n${truncatedText}` },
          ],
        },
      ];

      const { text: modelText } = await executeGeminiRequest({
        contents: directContents,
        temperature: 0.3,
        maxOutputTokens: MAX_FINAL_OUTPUT_TOKENS,
      });
      finalResponseText = modelText;
    } else {
      let aggregatedNotes = mergeSectionNotes(null, {});
      const chunkSummaries = [];

      for (let index = 0; index < chunkTexts.length; index += 1) {
        const chunk = chunkTexts[index];
        const chunkIndex = index + 1;
        const chunkSchemaLines = NOTE_SECTION_KEYS.map(key => `    "${key}": ["dato breve"]`).join(",\n");
        const chunkInstructions = `Analiza el fragmento ${chunkIndex} de ${chunkTexts.length} del PDF titulado "${safeName}". Extrae hallazgos concretos que ayuden a completar el brief y devuélvelos en un JSON válido con la forma:\n{\n  "summary": "máximo 5 oraciones en español con los datos clave del fragmento",\n  "notes": {\n${chunkSchemaLines}\n  },\n  "missingQuestions": ["pregunta puntual"]\n}\n- Cada arreglo debe contener como máximo ${MAX_NOTES_PER_SECTION} apuntes cortos (menos de 25 palabras) y evitar duplicados.\n- Mantén el idioma original de cada dato.\n- Si una sección no tiene información, deja el arreglo vacío.\n- Las preguntas pendientes deben ser concretas y accionables.\n- No añadas texto fuera del JSON.`;

        const chunkContents = [
          {
            role: "user",
            parts: [
              { text: chunkInstructions },
              { text: `Fragmento del PDF:\n\n${chunk}` },
            ],
          },
        ];

        const { text: chunkResponse } = await executeGeminiRequest({
          contents: chunkContents,
          temperature: 0.2,
          maxOutputTokens: 768,
        });

        const parsedChunk = extractJsonBlock(chunkResponse);
        aggregatedNotes = mergeSectionNotes(aggregatedNotes, parsedChunk?.notes || {});
        aggregatedMissing = addMissingQuestions(aggregatedMissing, parsedChunk?.missingQuestions);
        appendSummary(chunkSummaries, parsedChunk?.summary || "");
      }

      if (!notesHaveContent(aggregatedNotes)) {
        const fallbackContents = [
          {
            role: "user",
            parts: [
              { text: baseInstructions },
              { text: `Contenido extraído del PDF:\n\n${truncatedText}` },
            ],
          },
        ];

        const { text: fallbackText } = await executeGeminiRequest({
          contents: fallbackContents,
          temperature: 0.3,
          maxOutputTokens: MAX_FINAL_OUTPUT_TOKENS,
        });
        finalResponseText = fallbackText;
      } else {
        const notesPrompt = limitPromptBlock(formatNotesForPrompt(aggregatedNotes), 60000);
        const summariesPrompt = limitPromptBlock(formatChunkSummaries(chunkSummaries), 12000);
        const aggregatedMissingList = Array.from(aggregatedMissing);
        const missingPrompt = limitPromptBlock(formatMissingQuestions(aggregatedMissingList), 4000);

        const finalParts = [
          {
            text: `${baseInstructions}\n\nUsa únicamente la información proporcionada en las notas consolidadas. Si faltan datos, deja el campo vacío y registra la pregunta pendiente.`,
          },
          { text: `Notas consolidadas del PDF:\n\n${notesPrompt}` },
        ];

        if (aggregatedMissingList.length > 0) {
          finalParts.push({ text: missingPrompt });
        }

        if (summariesPrompt) {
          finalParts.push({ text: `Resúmenes parciales:\n\n${summariesPrompt}` });
        }

        const finalContents = [
          {
            role: "user",
            parts: finalParts,
          },
        ];

        const { text: finalText } = await executeGeminiRequest({
          contents: finalContents,
          temperature: 0.25,
          maxOutputTokens: MAX_FINAL_OUTPUT_TOKENS,
        });
        finalResponseText = finalText;
      }
    }

    const parsed = extractJsonBlock(finalResponseText);

    const assistantMessage = typeof parsed.assistantMessage === "string" ? parsed.assistantMessage.trim() : "";
    const prefilled = parsed.prefilled && typeof parsed.prefilled === "object" ? parsed.prefilled : {};
    aggregatedMissing = addMissingQuestions(aggregatedMissing, parsed.missingQuestions);
    const missingQuestions = Array.from(aggregatedMissing);

    res.json({
      assistantMessage,
      prefilled,
      missingQuestions,
    });
  } catch (error) {
    console.error("Error al prellenar brief desde PDF", error);

    const statusCode =
      typeof error?.statusCode === "number"
        ? error.statusCode
        : typeof error?.status === "number"
        ? error.status
        : 500;

    const responseBody = { message: error.message || "Error al analizar el PDF" };

    if (error?.code) {
      responseBody.code = error.code;
    }

    if (error?.details) {
      responseBody.details = error.details;
    }

    res.status(statusCode).json(responseBody);
  }
}

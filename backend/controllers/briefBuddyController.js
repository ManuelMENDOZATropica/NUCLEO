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

class GeminiResponseError extends Error {
  constructor(message, { statusCode = 500, code, details } = {}) {
    super(message);
    this.name = "GeminiResponseError";
    this.statusCode = statusCode;
    if (code) this.code = code;
    if (details) this.details = details;
  }
}

async function executeGeminiRequest({ contents, temperature = 0.7, maxOutputTokens = 1024 }) {
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

function extractJsonBlock(text) {
  if (!text) return null;
  const jsonStart = text.indexOf("```");
  if (jsonStart !== -1) {
    const afterStart = text.slice(jsonStart + 3);
    const secondFence = afterStart.indexOf("```");
    if (secondFence !== -1) {
      const fenced = afterStart.slice(0, secondFence).replace(/^json\n?/i, "");
      try {
        return JSON.parse(fenced);
      } catch {
        // continue
      }
    }
  }

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    const candidate = text.slice(braceStart, braceEnd + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return null;
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
    if (!structured) {
      throw new Error("No se pudo obtener un JSON válido desde Gemini");
    }

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
    res.status(500).json({ message: error.message || "Error interno" });
  }
}

export async function prefillBriefFromPdf(req, res) {
  try {
    const fileName = typeof req.body?.fileName === "string" ? req.body.fileName : "Documento";
    const rawData = typeof req.body?.fileData === "string" ? req.body.fileData : "";

    if (!rawData) {
      return res.status(400).json({ message: "Se requiere el archivo en formato base64" });
    }

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada");
    }

    const { text: extractedText } = await pdfParse(buffer);

    if (!extractedText) {
      throw new GeminiResponseError(
        "No pudimos extraer texto utilizable del PDF. Verifica que el documento contenga texto seleccionable u ofrece una versión con OCR.",
        {
          statusCode: 422,
          code: "PDF_PARSE_EMPTY",
        }
      );
    }

    const truncatedText = extractedText.length > 80000
      ? `${extractedText.slice(0, 80000)}\n\n[Texto truncado tras 80.000 caracteres]`
      : extractedText;

    const sanitizedName = fileName.replace(/[\r\n]+/g, " ").trim();
    const truncatedName = sanitizedName.length > 160 ? `${sanitizedName.slice(0, 157)}...` : sanitizedName;
    const safeName = truncatedName.replace(/["`]/g, "'") || "Documento";
    const instructions = `Analiza el contenido textual extraído del PDF titulado "${safeName}". Debes:
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

    const contents = [
      {
        role: "user",
        parts: [
          { text: instructions },
          { text: `Contenido extraído del PDF:\n\n${truncatedText}` },
        ],
      },
    ];

    const { text } = await executeGeminiRequest({ contents, temperature: 0.3, maxOutputTokens: 2048 });
    const parsed = extractJsonBlock(text);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("No se pudo obtener un JSON válido a partir del PDF");
    }

    const assistantMessage = typeof parsed.assistantMessage === "string" ? parsed.assistantMessage.trim() : "";
    const prefilled = parsed.prefilled && typeof parsed.prefilled === "object" ? parsed.prefilled : {};
    const missingQuestions = Array.isArray(parsed.missingQuestions) ? parsed.missingQuestions.filter(Boolean) : [];

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

import fs from "fs/promises";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { createSign, randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

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

let cachedContext = null;

async function loadContext() {
  if (cachedContext) return cachedContext;
  cachedContext = await fs.readFile(FRONTEND_PROMPT_PATH, "utf8");
  return cachedContext;
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

async function callGemini({ messages, extraPrompt, temperature = 0.7 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  const context = await loadContext();
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const contents = normalizeMessages(messages);
  if (extraPrompt) {
    contents.push({ role: "user", parts: [{ text: extraPrompt }] });
  }

  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [
        {
          text: "Inicia la conversación siguiendo las instrucciones de MELISA y BriefBuddy.",
        },
      ],
    });
  }

  const body = {
    contents,
    systemInstruction: {
      parts: [{ text: context }],
    },
    generationConfig: {
      temperature,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024,
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
  const candidates = json.candidates || [];
  const primary = candidates[0];
  if (!primary || !primary.content || !Array.isArray(primary.content.parts)) {
    throw new Error("La respuesta de Gemini no contiene contenido utilizable");
  }

  const text = primary.content.parts
    .map(part => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();

  return { text, raw: json };
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

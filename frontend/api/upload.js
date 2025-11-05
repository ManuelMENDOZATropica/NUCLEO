import formidable from "formidable";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";

import { createOpenAIClient, getOpenAIModel } from "../lib/openai.js";

export const config = {
  runtime: "nodejs",
  api: {
    bodyParser: false,
  },
};

const MAX_TEXT_LENGTH = 12_000;

const BRIEF_SCHEMA = {
  name: "BriefDraft",
  schema: {
    type: "object",
    additionalProperties: true,
    properties: {
      metadata: {
        type: "object",
        additionalProperties: true,
        properties: {
          clientName: { type: "string", default: "" },
          projectLabel: { type: "string", default: "" },
          title: { type: "string", default: "Brief inicial" },
        },
      },
      sections: {
        type: "object",
        additionalProperties: true,
        properties: {
          contact: { type: "object", additionalProperties: true },
          scope: { type: "array", items: { type: "string" } },
          objectives: { type: "array", items: { type: "string" } },
          audience: { type: "array", items: { type: "string" } },
          brand: { type: "array", items: { type: "string" } },
          deliverables: { type: "array", items: { type: "string" } },
          logistics: { type: "array", items: { type: "string" } },
          extras: { type: "array", items: { type: "string" } },
          brandMeli: {
            type: "object",
            additionalProperties: true,
            properties: {
              challenge: { type: "array", items: { type: "string" } },
              strategy: { type: "array", items: { type: "string" } },
              architectures: { type: "array", items: { type: "string" } },
              mediaEcosystem: { type: "array", items: { type: "string" } },
              production: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      summary: { type: "array", items: { type: "string" } },
      missing: { type: "array", items: { type: "string" } },
    },
    required: ["sections", "missing"],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.end(JSON.stringify({ message: "Method Not Allowed" }));
    return;
  }

  const form = formidable({
    multiples: false,
    maxFileSize: 25 * 1024 * 1024,
    allowEmptyFiles: false,
  });

  let file;
  try {
    const parsed = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });
    const uploaded = parsed.files.file || Object.values(parsed.files)[0];
    if (!uploaded) {
      throw new Error("No se encontró archivo en la solicitud");
    }
    file = uploaded;
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ message: error.message || "No se pudo procesar el archivo" }));
    return;
  }

  let rawText = "";
  try {
    const buffer = await readFile(file.filepath);
    const mime = file.mimetype || "";
    const ext = path.extname(file.originalFilename || "").toLowerCase();

    if (mime.includes("pdf") || ext === ".pdf") {
      rawText = await extractPdf(buffer);
    } else if (mime.includes("word") || ext === ".docx" || ext === ".doc") {
      rawText = await extractDocx(buffer);
    } else if (mime.includes("text")) {
      rawText = buffer.toString("utf8");
    } else {
      throw new Error("Tipo de archivo no soportado. Usa PDF o Word.");
    }

    if (!rawText || !rawText.trim()) {
      throw new Error(
        "No se encontró texto legible en el archivo proporcionado. Comparte otro documento o ingresa los datos manualmente."
      );
    }

    const condensed = rawText.replace(/\s+/g, " ").trim();
    const truncated = condensed.length > MAX_TEXT_LENGTH ? condensed.slice(0, MAX_TEXT_LENGTH) : condensed;

    const client = createOpenAIClient();
    const response = await client.responses.create({
      model: getOpenAIModel(),
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text:
                "Eres un planner creativo que genera borradores de brief JSON estrictamente válidos. Usa solo la información proporcionada y deja campos vacíos cuando falte información.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Analiza el siguiente contenido y genera un JSON con secciones resumidas, pendientes y highlights. Responde únicamente con JSON válido conforme al esquema." +
                "\n\nContenido:\n" +
                truncated,
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: BRIEF_SCHEMA,
      },
      temperature: 0.2,
      max_output_tokens: 1200,
    });

    const textOutput = collectTextFromResponse(response);
    const brief = safeParseJson(textOutput);

    const preview = truncated.slice(0, 600);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        brief,
        textPreview: preview,
        meta: {
          filename: file.originalFilename,
          mime: file.mimetype,
        },
      })
    );
  } catch (error) {
    console.error("Upload error", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: error?.message || "No se pudo analizar el archivo",
      })
    );
  } finally {
    if (file?.filepath) {
      await unlink(file.filepath).catch(() => {});
    }
  }
}

function collectTextFromResponse(response) {
  const chunks = [];
  if (Array.isArray(response?.output)) {
    for (const block of response.output) {
      if (Array.isArray(block?.content)) {
        for (const segment of block.content) {
          if (segment?.text) {
            chunks.push(segment.text);
          }
        }
      }
    }
  }
  if (!chunks.length && typeof response?.output_text === "string") {
    chunks.push(response.output_text);
  }
  return chunks.join("").trim();
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("OpenAI no devolvió un JSON válido. Intenta proporcionar más contexto o vuelve a intentarlo.");
  }
}

async function extractPdf(buffer) {
  try {
    const { text } = await pdfParse(buffer);
    if (text && text.trim()) {
      return text;
    }
  } catch (error) {
    console.warn("pdf-parse fallback", error.message);
  }
  return extractPdfWithPdfjs(buffer);
}

async function extractPdfWithPdfjs(buffer) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const strings = content.items
      .map(item => (typeof item.str === "string" ? item.str : ""))
      .filter(Boolean);
    text += strings.join(" ") + "\n";
  }
  return text;
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

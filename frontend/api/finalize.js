import { createOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import { loadPromptContextFromFs } from "../lib/prompt-node.js";
import { generateBriefDocx } from "../lib/docxTemplate.js";
import {
  createDriveClient,
  ensureDriveFolder,
  ensurePublicPermission,
  sanitizeDriveName,
  uploadOrUpdateFile,
} from "../lib/googleDrive.js";

export const config = {
  runtime: "nodejs",
};

const FINAL_SCHEMA = {
  name: "BriefFinal",
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
          title: { type: "string", default: "Brief final consolidado" },
          description: { type: "string", default: "" },
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
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Method Not Allowed" }));
    return;
  }

  let payload;
  try {
    payload = await parseJson(req);
  } catch (error) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: error.message || "JSON inválido" }));
    return;
  }

  const history = normalizeHistory(payload?.history);
  if (!history.length) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Se requiere el historial de mensajes para consolidar el brief" }));
    return;
  }

  const rawClientName = typeof payload?.clientName === "string" ? payload.clientName.trim() : "";
  const rawLabel = typeof payload?.label === "string" ? payload.label.trim() : "";
  const clientName = sanitizeDriveName(rawClientName);
  const label = sanitizeDriveName(rawLabel);

  try {
    const promptContext = await loadPromptContextFromFs();
    const client = createOpenAIClient();
    const model = getOpenAIModel();

    const finalResponse = await client.responses.create({
      model,
      input: buildFinalInput(promptContext, history, { clientName: rawClientName, label: rawLabel }),
      response_format: {
        type: "json_schema",
        json_schema: FINAL_SCHEMA,
      },
      temperature: 0.3,
      max_output_tokens: 1500,
    });

    const brief = safeParseJson(collectTextFromResponse(finalResponse));
    brief.metadata = {
      ...brief.metadata,
      clientName: rawClientName || brief.metadata?.clientName || "",
      projectLabel: rawLabel || brief.metadata?.projectLabel || "",
      title:
        brief.metadata?.title ||
        [rawClientName || null, rawLabel || null, "Brief final"].filter(Boolean).join(" - ") ||
        "Brief final consolidado",
    };

    const docBuffer = await generateBriefDocx(brief);

    const driveFolderId = process.env.DRIVE_FOLDER_ID;
    if (!driveFolderId) {
      throw new Error("DRIVE_FOLDER_ID no está configurado");
    }

    const drive = createDriveClient();

    const parentIds = [];
    let activeParent = driveFolderId;

    if (clientName) {
      const clientFolder = await ensureDriveFolder(drive, driveFolderId, clientName);
      activeParent = clientFolder.id;
    }

    if (label) {
      const projectFolder = await ensureDriveFolder(drive, activeParent, label);
      activeParent = projectFolder.id;
    }

    parentIds.push(activeParent);

    const fileName = buildDocxName({ clientName, label });
    const file = await uploadOrUpdateFile(drive, {
      name: fileName,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data: docBuffer,
      parents: parentIds,
    });

    const sharedFile = await ensurePublicPermission(drive, file.id);

    const markdownInfo = await maybeGenerateStateOfArt({
      client,
      model,
      history,
      promptContext,
      parents: parentIds,
      drive,
      label: rawLabel,
      folderLabel: label,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        drive: {
          fileId: file.id,
          fileUrl: sharedFile.webViewLink,
          folderId: parentIds[0] || driveFolderId,
          stateOfArt: markdownInfo,
        },
        brief,
      })
    );
  } catch (error) {
    console.error("Finalize error", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: error?.message || "No se pudo consolidar el brief" }));
  }
}

function normalizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter(item => item && typeof item.role === "string" && typeof item.content === "string")
    .map(item => ({
      role: item.role === "assistant" ? "assistant" : item.role === "system" ? "system" : "user",
      content: item.content,
    }));
}

async function parseJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (!body) {
    throw new Error("Cuerpo vacío");
  }
  return JSON.parse(body);
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
    throw new Error("El modelo devolvió un JSON inválido. Ajusta el historial e inténtalo nuevamente.");
  }
}

function buildFinalInput(promptContext, history, metadata) {
  const systemMessage = {
    role: "system",
    content: [
      {
        type: "text",
        text: `${promptContext.trim()}

Eres MELISA, especialista en briefs de Mercado Ads. Con la conversación proporcionada, genera un brief final completo en JSON usando el esquema indicado. Identifica los campos que permanecen incompletos dentro de la clave \"missing\" y resume los highlights más relevantes en \"summary\". No inventes datos.`,
      },
    ],
  };

  const conversation = history.map(message => ({
    role: message.role,
    content: [
      {
        type: "text",
        text: message.content,
      },
    ],
  }));

  const finale = {
    role: "user",
    content: [
      {
        type: "text",
        text: `Consolida el brief final respetando el esquema requerido. Si falta información, deja campos vacíos o breves comentarios dentro de \"missing\". Cliente: ${metadata.clientName || ""}. Proyecto: ${metadata.label || ""}.`,
      },
    ],
  };

  return [systemMessage, ...conversation, finale];
}

function buildDocxName({ clientName, label }) {
  const parts = [clientName || null, label || null, new Date().toISOString().split("T")[0]]
    .filter(Boolean)
    .join(" - ");
  return parts ? `${parts}.docx` : `Brief Buddy ${new Date().toISOString().split("T")[0]}.docx`;
}

async function maybeGenerateStateOfArt({ client, model, history, promptContext, parents, drive, label, folderLabel }) {
  if (!label) return null;

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: `${promptContext.trim()}

Genera un resumen "State of Art" en formato Markdown con tendencias, referencias y oportunidades detectadas. Usa máximo 400 palabras.`,
            },
          ],
        },
        ...history.map(message => ({
          role: message.role,
          content: [
            {
              type: "text",
              text: message.content,
            },
          ],
        })),
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Redacta un documento titulado "State of Art — ${label}" en Markdown.`,
            },
          ],
        },
      ],
      temperature: 0.4,
      max_output_tokens: 1200,
    });

    const markdown = collectTextFromResponse(response);
    if (!markdown) return null;

    const file = await uploadOrUpdateFile(drive, {
      name: `State of Art — ${folderLabel || label || "State of Art"}.md`,
      mimeType: "text/markdown",
      data: Buffer.from(markdown, "utf8"),
      parents,
    });

    const shared = await ensurePublicPermission(drive, file.id);
    return { fileId: file.id, fileUrl: shared.webViewLink };
  } catch (error) {
    console.warn("State of Art generation skipped", error.message);
    return null;
  }
}

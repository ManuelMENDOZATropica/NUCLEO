import { createOpenAIClient, getOpenAIModel } from "../../lib/openai.js";
import { loadPromptContextFromRequest } from "../../lib/prompt.js";

export const config = {
  runtime: "edge",
};

function normalizeMessages(rawMessages = []) {
  return rawMessages
    .filter(msg => msg && typeof msg.role === "string" && typeof msg.content === "string")
    .map(msg => ({
      role: msg.role === "assistant" ? "assistant" : msg.role === "system" ? "system" : "user",
      content: msg.content,
    }));
}

function toResponsesInput(messages = []) {
  return messages.map(message => ({
    role: message.role,
    content: [
      {
        type: "text",
        text: message.content,
      },
    ],
  }));
}

function buildSystemPrompt(promptContext, locale) {
  const trimmedContext = promptContext?.trim() || "";
  const localeInstruction =
    locale && typeof locale === "string"
      ? `Responde prioritariamente en ${locale}.`
      : "Responde en el idioma del usuario.";

  return `${trimmedContext}

Instrucciones clave para MELISA:
- Mantén las respuestas concisas (máximo 120 palabras) y claras.
- Usa viñetas para listar información relevante.
- Cierra SIEMPRE con una sección "Siguiente pregunta:" acompañada de una única pregunta concreta que ayude a completar el brief.
- Actualiza el estado de progreso en un comentario HTML con el formato exacto: @-- PROGRESS: {"complete": [...], "missing": [...]} --
- El comentario HTML debe reflejar qué secciones del brief están completas y cuáles faltan.
- Evita repetir datos innecesarios y reconoce cuando ya se proporcionó información.
- ${localeInstruction}`;
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = normalizeMessages(Array.isArray(payload?.messages) ? payload.messages : []);
  const locale = payload?.locale;

  try {
    const promptContext = await loadPromptContextFromRequest(request);
    const systemPrompt = buildSystemPrompt(promptContext, locale);
    const input = toResponsesInput([{ role: "system", content: systemPrompt }, ...messages]);

    const client = createOpenAIClient();
    const stream = await client.responses.stream({
      model: getOpenAIModel(),
      input,
      temperature: 0.6,
      max_output_tokens: 800,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            switch (event.type) {
              case "response.output_text.delta": {
                controller.enqueue(encoder.encode(`data: ${event.delta}\n\n`));
                break;
              }
              case "response.error": {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: event.error.message })}\n\n`)
                );
                break;
              }
              case "response.completed": {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                break;
              }
              default:
                break;
            }
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message || "Stream error" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.controller?.abort?.();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const message = error?.message || "No se pudo generar la respuesta";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

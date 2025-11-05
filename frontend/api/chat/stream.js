import { loadPromptContextForRequest } from "../../lib/prompt-edge.js";

export const config = {
  runtime: "edge",
};

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

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

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurado");
  }
  return apiKey;
}

function extractTextDelta(event) {
  if (!event) return "";

  if (event.type === "response.delta" && event.delta) {
    return extractTextDelta(event.delta);
  }

  if (event.type === "response.output_text.delta") {
    return typeof event.delta === "string"
      ? event.delta
      : Array.isArray(event.delta?.output_text_delta)
      ? event.delta.output_text_delta.join("")
      : Array.isArray(event.delta?.output_text)
      ? event.delta.output_text.join("")
      : event.delta?.output_text_delta || event.delta?.output_text || event.delta?.text || "";
  }

  if (event.type === "output_text.delta" || event.type === "output_text") {
    if (Array.isArray(event.output_text_delta)) {
      return event.output_text_delta.join("");
    }
    if (Array.isArray(event.output_text)) {
      return event.output_text.join("");
    }
    return event.output_text_delta || event.output_text || event.text || "";
  }

  if (typeof event === "object" && event.type) {
    return (
      (Array.isArray(event.output_text_delta) ? event.output_text_delta.join("") : event.output_text_delta) ||
      (Array.isArray(event.output_text) ? event.output_text.join("") : event.output_text) ||
      event.text ||
      (typeof event.delta === "string" ? event.delta : "")
    );
  }

  return "";
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

  let upstreamResponse;
  let abortController;

  try {
    const promptContext = await loadPromptContextForRequest(request);
    const systemPrompt = buildSystemPrompt(promptContext, locale);
    const input = toResponsesInput([{ role: "system", content: systemPrompt }, ...messages]);

    abortController = new AbortController();

    upstreamResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOpenAIApiKey()}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        input,
        temperature: 0.6,
        max_output_tokens: 800,
        stream: true,
      }),
      signal: abortController.signal,
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text();
      throw new Error(errorText || "No se pudo generar la respuesta");
    }
  } catch (error) {
    const message = error?.message || "No se pudo generar la respuesta";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstreamResponse.body.getReader();
      let buffer = "";
      let isDone = false;

      try {
        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const segments = buffer.split("\n\n");
          buffer = segments.pop() || "";

          for (const segment of segments) {
            if (!segment.startsWith("data:")) continue;
            const data = segment.slice(5).trim();
            if (!data) continue;

            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              isDone = true;
              break;
            }

            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch (error) {
              continue;
            }

            if (parsed.type === "response.error") {
              const errorMessage = parsed.error?.message || "OpenAI error";
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
              );
              isDone = true;
              break;
            }

            if (parsed.type === "response.completed") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              isDone = true;
              break;
            }

            const text = extractTextDelta(parsed);
            if (text) {
              controller.enqueue(encoder.encode(`data: ${text}\n\n`));
            }
          }
        }

        if (!isDone) {
          buffer += decoder.decode();
        }

        if (!isDone && buffer.trim()) {
          const tailSegments = buffer.split("\n\n");
          buffer = "";
          for (const segment of tailSegments) {
            if (!segment.startsWith("data:")) continue;
            const data = segment.slice(5).trim();
            if (!data) continue;

            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              isDone = true;
              break;
            }

            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch (error) {
              continue;
            }

            if (parsed.type === "response.error") {
              const errorMessage = parsed.error?.message || "OpenAI error";
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
              );
              isDone = true;
              break;
            }

            if (parsed.type === "response.completed") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              isDone = true;
              break;
            }

            const text = extractTextDelta(parsed);
            if (text) {
              controller.enqueue(encoder.encode(`data: ${text}\n\n`));
            }
          }
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error.message || "Stream error" })}\n\n`)
        );
      } finally {
        if (!isDone) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
        controller.close();
      }
    },
    cancel() {
      abortController?.abort();
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
}

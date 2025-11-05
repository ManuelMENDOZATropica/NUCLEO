const PROMPT_RELATIVE_PATH = "../public/Documents/BriefBuddy/prompt_context.txt";

export async function loadPromptContextFromRequest(request) {
  const requestUrl = new URL(request.url);
  const origin = `${requestUrl.protocol}//${requestUrl.host}`;
  const promptUrl = new URL("/Documents/BriefBuddy/prompt_context.txt", origin);
  const response = await fetch(promptUrl.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar prompt_context.txt (${response.status})`);
  }
  return response.text();
}

export async function loadPromptContextFromFs() {
  const fs = await import("node:fs/promises");
  const fileUrl = new URL(PROMPT_RELATIVE_PATH, import.meta.url);
  return fs.readFile(fileUrl, "utf8");
}

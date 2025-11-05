const PROMPT_PATH = "/Documents/BriefBuddy/prompt_context.txt";

export async function loadPromptContextForRequest(request) {
  const requestUrl = new URL(request.url);
  const origin = `${requestUrl.protocol}//${requestUrl.host}`;
  const promptUrl = new URL(PROMPT_PATH, origin);
  const response = await fetch(promptUrl.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar prompt_context.txt (${response.status})`);
  }
  return response.text();
}

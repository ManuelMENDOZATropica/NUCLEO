import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROMPT_RELATIVE_PATH = "../public/Documents/BriefBuddy/prompt_context.txt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_ABSOLUTE_PATH = path.join(__dirname, PROMPT_RELATIVE_PATH);

export async function loadPromptContextFromFs() {
  return readFile(PROMPT_ABSOLUTE_PATH, "utf8");
}

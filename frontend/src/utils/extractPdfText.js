import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function sanitizeExtractedText(segments) {
  return segments.join("\n\n").replace(/[\u0000\x00]+/g, "").trim();
}

export async function extractPdfTextFromBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("extractPdfTextFromBytes requiere un Uint8Array válido");
  }

  const loadingTask = getDocument({ data: bytes });

  try {
    const pdf = await loadingTask.promise;
    const segments = [];

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => (item && typeof item.str === "string" ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .trim();

      if (pageText) {
        segments.push(pageText);
      }
    }

    return sanitizeExtractedText(segments);
  } catch (error) {
    const baseMessage = error && typeof error.message === "string" ? error.message : "error desconocido";
    throw new Error(`No se pudo extraer texto del PDF: ${baseMessage}`);
  } finally {
    if (loadingTask && typeof loadingTask.destroy === "function") {
      try {
        await loadingTask.destroy();
      } catch (cleanupError) {
        console.warn("No se pudo liberar los recursos de pdf.js", cleanupError);
      }
    }
  }
}

export async function extractPdfText(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new TypeError("extractPdfText requiere un archivo válido");
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return extractPdfTextFromBytes(bytes);
}

export default extractPdfText;

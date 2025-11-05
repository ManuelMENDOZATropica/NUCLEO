import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

const TEMPLATE_PATH = "../public/Documents/BriefBuddy/brief template.docx";

function createTextRun(doc, text, { bold = false } = {}) {
  const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const run = doc.createElementNS(wNs, "w:r");
  if (bold) {
    const rPr = doc.createElementNS(wNs, "w:rPr");
    const b = doc.createElementNS(wNs, "w:b");
    rPr.appendChild(b);
    run.appendChild(rPr);
  }
  const textNode = doc.createElementNS(wNs, "w:t");
  const safeText = (text ?? "").toString();
  if (/\s/.test(safeText) && (safeText.startsWith(" ") || safeText.endsWith(" "))) {
    textNode.setAttribute("xml:space", "preserve");
  }
  textNode.appendChild(doc.createTextNode(safeText));
  run.appendChild(textNode);
  return run;
}

function createParagraph(doc, text, options = {}) {
  const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraph = doc.createElementNS(wNs, "w:p");
  const run = createTextRun(doc, text, options);
  paragraph.appendChild(run);
  return paragraph;
}

function appendHeading(body, doc, text) {
  const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraph = doc.createElementNS(wNs, "w:p");
  const pPr = doc.createElementNS(wNs, "w:pPr");
  const pStyle = doc.createElementNS(wNs, "w:pStyle");
  pStyle.setAttribute("w:val", "Heading1");
  pPr.appendChild(pStyle);
  paragraph.appendChild(pPr);
  paragraph.appendChild(createTextRun(doc, text, { bold: true }));
  body.appendChild(paragraph);
}

function appendSubheading(body, doc, text) {
  const wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraph = doc.createElementNS(wNs, "w:p");
  const pPr = doc.createElementNS(wNs, "w:pPr");
  const pStyle = doc.createElementNS(wNs, "w:pStyle");
  pStyle.setAttribute("w:val", "Heading2");
  pPr.appendChild(pStyle);
  paragraph.appendChild(pPr);
  paragraph.appendChild(createTextRun(doc, text, { bold: true }));
  body.appendChild(paragraph);
}

function appendBulletList(body, doc, items = []) {
  items
    .filter(item => typeof item === "string" && item.trim().length > 0)
    .forEach(item => {
      body.appendChild(createParagraph(doc, `• ${item.trim()}`));
    });
}

function appendKeyValue(body, doc, label, value) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return;
  }
  const textValue = Array.isArray(value) ? value.join(" | ") : value;
  body.appendChild(createParagraph(doc, `${label}: ${textValue}`));
}

export async function generateBriefDocx(brief, options = {}) {
  const templateUrl = new URL(TEMPLATE_PATH, import.meta.url);
  const template = await readFile(templateUrl);
  const zip = await JSZip.loadAsync(template);
  const documentXml = await zip.file("word/document.xml").async("string");

  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const doc = parser.parseFromString(documentXml, "application/xml");
  const body = doc.getElementsByTagName("w:body")[0];
  if (!body) {
    throw new Error("La plantilla no contiene un cuerpo de documento válido");
  }

  const section = Array.from(body.childNodes).find(node => node.nodeName === "w:sectPr");
  while (body.firstChild) {
    body.removeChild(body.firstChild);
  }

  const { metadata = {}, sections = {}, summary = [], missing = [] } = brief || {};
  appendHeading(body, doc, metadata.title || "Brief Consolidado");
  appendParagraphWithSpacing(body, doc, metadata.description || "Resumen generado automáticamente por Brief Buddy.");

  appendSubheading(body, doc, "Contacto");
  appendKeyValue(body, doc, "Nombre", sections.contact?.name || "");
  appendKeyValue(body, doc, "Email", sections.contact?.email || "");
  appendKeyValue(body, doc, "Teléfono", sections.contact?.phone || "");
  appendKeyValue(body, doc, "Cargo", sections.contact?.role || "");

  appendSubheading(body, doc, "Alcance");
  appendBulletList(body, doc, sections.scope || []);

  appendSubheading(body, doc, "Objetivos");
  appendBulletList(body, doc, sections.objectives || []);

  appendSubheading(body, doc, "Audiencia");
  appendBulletList(body, doc, sections.audience || []);

  appendSubheading(body, doc, "Marca");
  appendBulletList(body, doc, sections.brand || []);

  appendSubheading(body, doc, "Entregables");
  appendBulletList(body, doc, sections.deliverables || []);

  appendSubheading(body, doc, "Logística");
  appendBulletList(body, doc, sections.logistics || []);

  appendSubheading(body, doc, "Extras");
  appendBulletList(body, doc, sections.extras || []);

  if (sections.brandMeli) {
    appendSubheading(body, doc, "Brand / MELI");
    appendSubSection(body, doc, "Challenge", sections.brandMeli.challenge);
    appendSubSection(body, doc, "Strategy", sections.brandMeli.strategy);
    appendSubSection(body, doc, "Architectures", sections.brandMeli.architectures);
    appendSubSection(body, doc, "Media ecosystem", sections.brandMeli.mediaEcosystem);
    appendSubSection(body, doc, "Production", sections.brandMeli.production);
  }

  if (summary.length) {
    appendSubheading(body, doc, "Highlights");
    appendBulletList(body, doc, summary);
  }

  if (missing.length) {
    appendSubheading(body, doc, "Pendientes");
    appendBulletList(body, doc, missing);
  }

  if (section) {
    body.appendChild(section);
  }

  const updatedXml = serializer.serializeToString(doc);
  zip.file("word/document.xml", updatedXml);
  return zip.generateAsync({ type: "nodebuffer" });
}

function appendParagraphWithSpacing(body, doc, text) {
  if (!text) return;
  body.appendChild(createParagraph(doc, text));
}

function appendSubSection(body, doc, title, items) {
  if (!items || (Array.isArray(items) && items.length === 0)) {
    return;
  }
  appendParagraphWithSpacing(body, doc, title);
  if (Array.isArray(items)) {
    appendBulletList(body, doc, items);
  } else {
    body.appendChild(createParagraph(doc, items));
  }
}

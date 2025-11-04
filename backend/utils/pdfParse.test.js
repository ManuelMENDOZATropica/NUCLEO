import test from "node:test";
import assert from "node:assert/strict";

import { extractTextFromStream } from "./pdfParse.js";

test("extractTextFromStream joins literals within TJ arrays", () => {
  const buffer = Buffer.from("[(Hello) -120 (World)] TJ", "latin1");
  const result = extractTextFromStream(buffer);

  assert.equal(result, "HelloWorld");
});

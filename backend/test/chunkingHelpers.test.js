import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHUNK_OVERLAP,
  MAX_CHUNK_LENGTH,
  MAX_NOTES_PER_SECTION,
  mergeSectionNotes,
  splitTextIntoChunks,
} from '../controllers/briefBuddyController.js';

test('splitTextIntoChunks creates overlapping segments when text exceeds limit', () => {
  const text = 'x'.repeat(300);
  const chunkSize = 100;
  const overlap = 10;
  const chunks = splitTextIntoChunks(text, chunkSize, overlap);

  assert.equal(chunks.length, 4);
  assert.ok(chunks.every(chunk => chunk.length <= chunkSize));
  assert.equal(chunks[0].slice(-overlap), chunks[1].slice(0, overlap));
});

test('splitTextIntoChunks returns single chunk when text fits limit', () => {
  const text = 'contenido breve';
  const chunks = splitTextIntoChunks(text, MAX_CHUNK_LENGTH, CHUNK_OVERLAP);

  assert.deepEqual(chunks, ['contenido breve']);
});

test('mergeSectionNotes deduplicates and respects section limits', () => {
  const initial = mergeSectionNotes(null, {
    project: ['Nombre de proyecto', 'Nombre de proyecto'],
  });

  const manyNotes = Array.from({ length: 20 }, (_, index) => `Dato ${index + 1}`);
  const merged = mergeSectionNotes(initial, { project: manyNotes });

  assert.ok(Array.isArray(merged.project));
  assert.equal(merged.project.length, MAX_NOTES_PER_SECTION);
  assert.equal(merged.project[0], 'Nombre de proyecto');

  const mergedAgain = mergeSectionNotes(merged, { strategy: ['Insight clave'] });
  assert.deepEqual(mergedAgain.strategy, ['Insight clave']);
  assert.ok(Array.isArray(mergedAgain.challenge));
  assert.equal(mergedAgain.challenge.length, 0);
});

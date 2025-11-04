import test from 'node:test';
import assert from 'node:assert/strict';

import { extractJsonBlock, GeminiResponseError } from '../controllers/briefBuddyController.js';

test('extractJsonBlock parses fenced JSON responses', () => {
  const text = [
    'Gemini response:',
    '```json',
    '{',
    '  "answer": "42",',
    '  "list": ["uno", "dos"]',
    '}',
    '```',
    'fin.',
  ].join('\n');

  const parsed = extractJsonBlock(text);

  assert.deepEqual(parsed, { answer: '42', list: ['uno', 'dos'] });
});

test('extractJsonBlock repairs trailing commas and unescaped quotes', () => {
  const quote = '"';
  const text = `{"quote": "El asistente dijo ${quote}hola${quote} y se fue", "items": ["uno", "dos",],}`;

  const parsed = extractJsonBlock(text);

  assert.equal(parsed.quote, 'El asistente dijo "hola" y se fue');
  assert.deepEqual(parsed.items, ['uno', 'dos']);
});

test('extractJsonBlock throws GeminiResponseError when JSON cannot be recovered', () => {
  assert.throws(
    () => extractJsonBlock('Respuesta: **sin estructura**'),
    error => error instanceof GeminiResponseError && error.statusCode === 422
  );
});

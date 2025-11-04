import test from 'node:test';
import assert from 'node:assert/strict';

import {
  executeGeminiRequest,
  GeminiResponseError,
} from '../controllers/briefBuddyController.js';

test('executeGeminiRequest informa cuando el PDF supera el límite de tokens', async () => {
  const originalFetch = globalThis.fetch;
  const previousApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-api-key';

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          finishReason: 'MAX_TOKENS',
          content: { parts: [] },
        },
      ],
    }),
    text: async () => '',
  });

  try {
    await assert.rejects(
      () =>
        executeGeminiRequest({
          contents: [{ role: 'user', parts: [{ text: 'Contenido del PDF' }] }],
        }),
      error =>
        error instanceof GeminiResponseError &&
        error.code === 'GEMINI_MAX_TOKENS' &&
        error.statusCode === 413 &&
        /demasiado largo/i.test(error.message)
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (typeof previousApiKey === 'undefined') {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousApiKey;
    }
  }
});

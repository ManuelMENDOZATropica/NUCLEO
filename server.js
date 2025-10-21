import { createServer } from 'http';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'publications.json');
const PORT = Number.parseInt(process.env.PORT ?? '5000', 10);

async function ensureDataFile() {
  try {
    await access(DATA_FILE, constants.F_OK);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readPublications() {
  await ensureDataFile();
  const content = await readFile(DATA_FILE, 'utf8');
  if (!content.trim()) {
    return [];
  }
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error parsing publications.json', error);
    throw new Error('Error reading data file');
  }
}

async function writePublications(publications) {
  await ensureDataFile();
  await writeFile(DATA_FILE, JSON.stringify(publications, null, 2), 'utf8');
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (payload === undefined) {
    res.writeHead(statusCode, headers);
    res.end();
    return;
  }

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function matchRoute(pathname) {
  if (pathname === '/api/publications') {
    return { type: 'collection' };
  }
  const match = pathname.match(/^\/api\/publications\/(.+)$/);
  if (match) {
    return { type: 'item', id: decodeURIComponent(match[1]) };
  }
  return null;
}

function sanitizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => sanitizeString(tag)).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function buildSlug(id, slug) {
  const slugValue = sanitizeString(slug);
  if (slugValue) {
    return slugValue;
  }
  const baseId = sanitizeString(id);
  return baseId ? `publicaciones/${baseId}` : '';
}

function generateId() {
  return crypto.randomUUID();
}

function applyPublicationUpdates(existing, updates) {
  const now = new Date().toISOString();
  const next = {
    ...existing,
    title: updates.title ? sanitizeString(updates.title) : existing.title,
    summary: updates.summary ? sanitizeString(updates.summary) : existing.summary,
    body: updates.body ? sanitizeString(updates.body) : existing.body,
    status: updates.status ? sanitizeString(updates.status) : existing.status,
    authorEmail: updates.authorEmail ? sanitizeString(updates.authorEmail) : existing.authorEmail,
    tags: normalizeTags(updates.tags ?? existing.tags),
    section: updates.section ? sanitizeString(updates.section) : existing.section,
    slug: updates.slug ? buildSlug(existing.id, updates.slug) : existing.slug,
    updatedAt: now
  };

  if (next.status === 'published') {
    next.publishedAt = updates.publishedAt
      ? sanitizeString(updates.publishedAt)
      : existing.publishedAt ?? now;
  } else {
    next.publishedAt = updates.publishedAt ? sanitizeString(updates.publishedAt) : null;
  }

  return next;
}

const server = createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  if (method === 'OPTIONS') {
    sendJson(res, 204);
    return;
  }

  const route = matchRoute(url.pathname);
  if (!route) {
    sendJson(res, 404, { message: 'Not found' });
    return;
  }

  try {
    if (route.type === 'collection') {
      if (method === 'GET') {
        const publications = await readPublications();
        sendJson(res, 200, publications);
        return;
      }

      if (method === 'POST') {
        const payload = await parseRequestBody(req);
        const title = sanitizeString(payload.title);
        const summary = sanitizeString(payload.summary);
        const body = sanitizeString(payload.body);
        const authorEmail = sanitizeString(payload.authorEmail);

        if (!title || !summary || !body || !authorEmail) {
          sendJson(res, 400, {
            message:
              'Los campos title, summary, body y authorEmail son obligatorios para crear una publicación.'
          });
          return;
        }

        const publications = await readPublications();
        const id = sanitizeString(payload.id) || generateId();

        if (publications.some((publication) => publication.id === id)) {
          sendJson(res, 409, { message: `Ya existe una publicación con id ${id}.` });
          return;
        }

        const now = new Date().toISOString();
        const newPublication = {
          id,
          slug: buildSlug(id, payload.slug),
          title,
          summary,
          body,
          tags: normalizeTags(payload.tags),
          section: sanitizeString(payload.section) || 'publicaciones',
          status: sanitizeString(payload.status) || 'draft',
          authorEmail,
          createdAt: now,
          updatedAt: now,
          publishedAt: null
        };

        if (newPublication.status === 'published') {
          newPublication.publishedAt = sanitizeString(payload.publishedAt) || now;
        }

        publications.push(newPublication);
        await writePublications(publications);
        sendJson(res, 201, newPublication);
        return;
      }

      sendJson(res, 405, { message: 'Método no permitido.' });
      return;
    }

    if (route.type === 'item') {
      const publications = await readPublications();
      const index = publications.findIndex((publication) => publication.id === route.id);
      if (index === -1) {
        sendJson(res, 404, { message: `No se encontró la publicación con id ${route.id}.` });
        return;
      }

      if (method === 'GET') {
        sendJson(res, 200, publications[index]);
        return;
      }

      if (method === 'PUT') {
        const payload = await parseRequestBody(req);
        const updatedPublication = applyPublicationUpdates(publications[index], payload);
        publications[index] = updatedPublication;
        await writePublications(publications);
        sendJson(res, 200, updatedPublication);
        return;
      }

      if (method === 'DELETE') {
        publications.splice(index, 1);
        await writePublications(publications);
        sendJson(res, 204);
        return;
      }

      sendJson(res, 405, { message: 'Método no permitido.' });
      return;
    }
  } catch (error) {
    console.error('Error handling request', error);
    sendJson(res, 500, { message: 'Error interno del servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`API de publicaciones escuchando en http://localhost:${PORT}`);
});

export default server;

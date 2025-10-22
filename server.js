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
const CATEGORIES_FILE = join(DATA_DIR, 'categories.json');
const POSTS_DIR = join(DATA_DIR, 'posts');
const POSTS_FILE = join(POSTS_DIR, 'posts.json');
const PORT = Number.parseInt(process.env.PORT ?? '5000', 10);

async function ensureDataFile() {
  try {
    await access(DATA_FILE, constants.F_OK);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function ensureCategoriesFile() {
  try {
    await access(CATEGORIES_FILE, constants.F_OK);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CATEGORIES_FILE, '[]', 'utf8');
  }
}

async function ensurePostsFile() {
  try {
    await access(POSTS_FILE, constants.F_OK);
  } catch {
    await mkdir(POSTS_DIR, { recursive: true });
    await writeFile(POSTS_FILE, '[]', 'utf8');
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

async function readCategories() {
  await ensureCategoriesFile();
  const content = await readFile(CATEGORIES_FILE, 'utf8');
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
    console.error('Error parsing categories.json', error);
    throw new Error('Error reading categories file');
  }
}

async function writeCategories(categories) {
  await ensureCategoriesFile();
  await writeFile(CATEGORIES_FILE, JSON.stringify(categories, null, 2), 'utf8');
}

async function readPosts() {
  await ensurePostsFile();
  const content = await readFile(POSTS_FILE, 'utf8');
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
    console.error('Error parsing posts.json', error);
    throw new Error('Error reading posts file');
  }
}

async function writePosts(posts) {
  await ensurePostsFile();
  await writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
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
    return { resource: 'publications', type: 'collection' };
  }
  if (pathname === '/api/posts') {
    return { resource: 'posts', type: 'collection' };
  }
  if (pathname === '/api/categories') {
    return { resource: 'categories', type: 'collection' };
  }

  const publicationMatch = pathname.match(/^\/api\/publications\/(.+)$/);
  if (publicationMatch) {
    return { resource: 'publications', type: 'item', id: decodeURIComponent(publicationMatch[1]) };
  }

  const postMatch = pathname.match(/^\/api\/posts\/(.+)$/);
  if (postMatch) {
    return { resource: 'posts', type: 'item', id: decodeURIComponent(postMatch[1]) };
  }

  const categoryMatch = pathname.match(/^\/api\/categories\/(.+)$/);
  if (categoryMatch) {
    return { resource: 'categories', type: 'item', id: decodeURIComponent(categoryMatch[1]) };
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

function buildCategorySlug(id, slug) {
  const slugValue = sanitizeString(slug);
  if (slugValue) {
    return slugValue;
  }
  const baseId = sanitizeString(id);
  return baseId ? `categorias/${baseId}` : '';
}

function generateId() {
  return crypto.randomUUID();
}

function normalizeEmail(email) {
  return sanitizeString(email).toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeStatus(status) {
  const allowed = new Set(['draft', 'review', 'published']);
  const normalized = sanitizeString(status).toLowerCase();
  if (allowed.has(normalized)) {
    return normalized;
  }
  return 'draft';
}

function normalizeCategoryStatus(status) {
  const allowed = new Set(['active', 'archived']);
  const normalized = sanitizeString(status).toLowerCase();
  if (allowed.has(normalized)) {
    return normalized;
  }
  return 'active';
}

function normalizeCategoryId(id) {
  const normalized = sanitizeString(id).toLowerCase();
  if (!normalized) {
    return '';
  }
  return normalized.replace(/\s+/g, '-');
}

function applyCategoryUpdates(existing, updates) {
  const now = new Date().toISOString();
  const next = {
    ...existing,
    name: updates.name ? sanitizeString(updates.name) : existing.name,
    description: updates.description ? sanitizeString(updates.description) : existing.description,
    status: updates.status ? normalizeCategoryStatus(updates.status) : existing.status,
    slug: updates.slug ? buildCategorySlug(existing.id, updates.slug) : existing.slug,
    updatedAt: now
  };

  if (!next.name) {
    throw new Error('El nombre de la categoría no puede estar vacío.');
  }

  if (!next.description) {
    throw new Error('La descripción de la categoría no puede estar vacía.');
  }

  return next;
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

function applyPostUpdates(existing, updates) {
  const now = new Date().toISOString();
  const status = updates.status ? normalizeStatus(updates.status) : existing.status;
  const next = {
    ...existing,
    categoryId: updates.categoryId ? sanitizeString(updates.categoryId) : existing.categoryId,
    title: updates.title ? sanitizeString(updates.title) : existing.title,
    summary: updates.summary ? sanitizeString(updates.summary) : existing.summary,
    body: updates.body ? sanitizeString(updates.body) : existing.body,
    status,
    authorEmail: updates.authorEmail ? sanitizeString(updates.authorEmail) : existing.authorEmail,
    updatedAt: now
  };

  if (status === 'published') {
    next.publishedAt = updates.publishedAt
      ? sanitizeString(updates.publishedAt)
      : existing.publishedAt ?? now;
  } else {
    next.publishedAt = null;
  }

  if (!next.categoryId || !next.title || !next.summary || !next.body || !next.authorEmail) {
    throw new Error('Los campos categoryId, title, summary, body y authorEmail no pueden estar vacíos.');
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
    if (route.resource === 'publications' && route.type === 'collection') {
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

    if (route.resource === 'publications' && route.type === 'item') {
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

    if (route.resource === 'categories' && route.type === 'collection') {
      if (method === 'GET') {
        const categories = await readCategories();
        sendJson(res, 200, categories);
        return;
      }

      if (method === 'POST') {
        const payload = await parseRequestBody(req);
        const id = normalizeCategoryId(payload.id) || generateId();
        const name = sanitizeString(payload.name);
        const description = sanitizeString(payload.description);
        const status = normalizeCategoryStatus(payload.status);
        const createdBy = normalizeEmail(payload.createdBy);
        const slug = buildCategorySlug(id, payload.slug);

        if (!id || !name || !description || !createdBy) {
          sendJson(res, 400, {
            message:
              'Los campos id, name, description y createdBy son obligatorios para crear una categoría.'
          });
          return;
        }

        if (!isValidEmail(createdBy)) {
          sendJson(res, 400, { message: 'El campo createdBy debe ser un correo válido.' });
          return;
        }

        const categories = await readCategories();

        if (categories.some((category) => category.id === id)) {
          sendJson(res, 409, { message: `Ya existe una categoría con id ${id}.` });
          return;
        }

        const now = new Date().toISOString();
        const newCategory = {
          id,
          slug,
          name,
          description,
          status,
          createdAt: now,
          updatedAt: now,
          createdBy
        };

        categories.push(newCategory);
        await writeCategories(categories);
        sendJson(res, 201, newCategory);
        return;
      }

      sendJson(res, 405, { message: 'Método no permitido.' });
      return;
    }

    if (route.resource === 'categories' && route.type === 'item') {
      const categories = await readCategories();
      const index = categories.findIndex((category) => category.id === route.id);
      if (index === -1) {
        sendJson(res, 404, { message: `No se encontró la categoría con id ${route.id}.` });
        return;
      }

      if (method === 'GET') {
        sendJson(res, 200, categories[index]);
        return;
      }

      if (method === 'PUT') {
        const payload = await parseRequestBody(req);
        let updatedCategory;
        try {
          updatedCategory = applyCategoryUpdates(categories[index], payload);
        } catch (error) {
          sendJson(res, 400, { message: error.message });
          return;
        }

        categories[index] = updatedCategory;
        await writeCategories(categories);
        sendJson(res, 200, updatedCategory);
        return;
      }

      if (method === 'DELETE') {
        categories.splice(index, 1);
        await writeCategories(categories);
        sendJson(res, 204);
        return;
      }

      sendJson(res, 405, { message: 'Método no permitido.' });
      return;
    }

    if (route.resource === 'posts' && route.type === 'collection') {
      if (method === 'GET') {
        const posts = await readPosts();
        sendJson(res, 200, posts);
        return;
      }

      if (method === 'POST') {
        const payload = await parseRequestBody(req);
        const categoryId = sanitizeString(payload.categoryId);
        const title = sanitizeString(payload.title);
        const summary = sanitizeString(payload.summary);
        const body = sanitizeString(payload.body);
        const authorEmail = sanitizeString(payload.authorEmail);
        const status = normalizeStatus(payload.status);

        if (!categoryId || !title || !summary || !body || !authorEmail) {
          sendJson(res, 400, {
            message: 'Los campos categoryId, title, summary, body y authorEmail son obligatorios para crear un post.'
          });
          return;
        }

        const posts = await readPosts();
        const id = sanitizeString(payload.id) || generateId();

        if (posts.some((post) => post.id === id)) {
          sendJson(res, 409, { message: `Ya existe un post con id ${id}.` });
          return;
        }

        const now = new Date().toISOString();
        const newPost = {
          id,
          categoryId,
          title,
          summary,
          body,
          status,
          authorEmail,
          createdAt: now,
          updatedAt: now,
          publishedAt: null
        };

        if (status === 'published') {
          newPost.publishedAt = sanitizeString(payload.publishedAt) || now;
        }

        posts.push(newPost);
        await writePosts(posts);
        sendJson(res, 201, newPost);
        return;
      }

      sendJson(res, 405, { message: 'Método no permitido.' });
      return;
    }

    if (route.resource === 'posts' && route.type === 'item') {
      const posts = await readPosts();
      const index = posts.findIndex((post) => post.id === route.id);
      if (index === -1) {
        sendJson(res, 404, { message: `No se encontró el post con id ${route.id}.` });
        return;
      }

      if (method === 'GET') {
        sendJson(res, 200, posts[index]);
        return;
      }

      if (method === 'PUT') {
        const payload = await parseRequestBody(req);
        try {
          const updatedPost = applyPostUpdates(posts[index], payload);
          posts[index] = updatedPost;
          await writePosts(posts);
          sendJson(res, 200, updatedPost);
        } catch (error) {
          sendJson(res, 400, { message: error.message || 'Datos inválidos para actualizar el post.' });
        }
        return;
      }

      if (method === 'DELETE') {
        posts.splice(index, 1);
        await writePosts(posts);
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

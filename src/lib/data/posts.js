import { getCategoryById } from './categories.js';
import { getUserByEmail } from './users.js';
import { canCreate, canPublish, canRead, RESOURCE_TYPES } from '../permissions.js';

const postModules = import.meta.glob('../../../data/posts/**/*.json', {
  eager: true,
  import: 'default'
});

const posts = Object.values(postModules).map((moduleExport) =>
  typeof moduleExport === 'object' ? moduleExport : JSON.parse(moduleExport)
);

export const POSTS = posts;

export function getPosts() {
  return POSTS.slice();
}

export function getPostById(id) {
  if (!id) {
    return null;
  }
  return POSTS.find((post) => post.id === id) ?? null;
}

export function getPostsByCategory(categoryId) {
  if (!categoryId) {
    return [];
  }
  const normalized = categoryId.toLowerCase();
  return POSTS.filter((post) => post.categoryId.toLowerCase() === normalized);
}

export function getPublishedPostsByCategory(categoryId) {
  return getPostsByCategory(categoryId).filter((post) => post.status === 'published');
}

export function getReadablePostsForUser(user, categoryId = null) {
  if (!user || !canRead(user, RESOURCE_TYPES.POST)) {
    return [];
  }

  if (categoryId) {
    return getPostsByCategory(categoryId);
  }

  return getPosts();
}

export function getEditablePostsForUser(user, categoryId = null) {
  if (!user) {
    return [];
  }

  if (canPublish(user, RESOURCE_TYPES.POST)) {
    if (categoryId) {
      return getPostsByCategory(categoryId);
    }
    return getPosts();
  }

  if (!canCreate(user, RESOURCE_TYPES.POST)) {
    return [];
  }

  const normalizedEmail = user.email.toLowerCase();
  return getPosts().filter((post) => post.authorEmail.toLowerCase() === normalizedEmail);
}

export function ensurePostHasValidReferences(post) {
  const category = getCategoryById(post.categoryId);
  if (!category) {
    throw new Error(`El post ${post.id} hace referencia a una categoría inexistente.`);
  }

  const author = getUserByEmail(post.authorEmail);
  if (!author) {
    throw new Error(`El post ${post.id} no tiene un autor registrado (${post.authorEmail}).`);
  }

  if (!canCreate(author, RESOURCE_TYPES.POST, post)) {
    throw new Error(`El autor ${author.email} no tiene permisos para crear el post ${post.id}.`);
  }

  if (post.status === 'published' && !canPublish(author, RESOURCE_TYPES.POST, post)) {
    throw new Error(`El autor ${author.email} no tiene permisos para publicar el post ${post.id}.`);
  }
}

POSTS.forEach((post) => {
  ensurePostHasValidReferences(post);
});

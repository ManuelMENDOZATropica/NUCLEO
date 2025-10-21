import { getUserByEmail } from './users.js';
import { canPublish, canRead, canCreate, RESOURCE_TYPES } from '../permissions.js';

const publicationModules = import.meta.glob('../../../data/publications/**/*.json', {
  eager: true,
  import: 'default'
});

const publications = Object.values(publicationModules).map((moduleExport) =>
  typeof moduleExport === 'object' ? moduleExport : JSON.parse(moduleExport)
);

export const PUBLICATIONS = publications;

export function getPublications() {
  return PUBLICATIONS.slice();
}

export function getPublicationBySlug(slug) {
  if (!slug) {
    return null;
  }
  return PUBLICATIONS.find((publication) => publication.slug === slug) ?? null;
}

export function getPublicationsByStatus(status) {
  return PUBLICATIONS.filter((publication) => publication.status === status);
}

export function getPublicationsByAuthor(email) {
  return PUBLICATIONS.filter((publication) =>
    publication.authorEmail.toLowerCase() === email?.toLowerCase()
  );
}

export function getReadablePublicationsForUser(user) {
  if (!user || !canRead(user, RESOURCE_TYPES.PUBLICATION)) {
    return [];
  }
  return getPublications();
}

export function getEditablePublicationsForUser(user) {
  if (!user) {
    return [];
  }

  if (canPublish(user, RESOURCE_TYPES.PUBLICATION)) {
    return getPublications();
  }

  if (!canCreate(user, RESOURCE_TYPES.PUBLICATION)) {
    return [];
  }

  return getPublicationsByAuthor(user.email);
}

export function ensurePublicationAuthorHasAccess(publication) {
  const author = getUserByEmail(publication.authorEmail);
  if (!author) {
    throw new Error(`La publicación ${publication.id} no tiene un autor registrado en el sistema.`);
  }

  if (!canCreate(author, RESOURCE_TYPES.PUBLICATION, publication)) {
    throw new Error(
      `El autor ${author.email} no tiene permisos para crear la publicación ${publication.id}.`
    );
  }

  if (
    publication.status === 'published' &&
    !canPublish(author, RESOURCE_TYPES.PUBLICATION, publication)
  ) {
    throw new Error(
      `El autor ${author.email} no cuenta con permisos para publicar ${publication.id}.`
    );
  }

  return true;
}

PUBLICATIONS.forEach((publication) => {
  ensurePublicationAuthorHasAccess(publication);
});

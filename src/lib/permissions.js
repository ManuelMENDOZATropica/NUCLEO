export const ROLES = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
});

export const RESOURCE_TYPES = Object.freeze({
  PUBLICATION: 'publication',
  USER: 'user',
  CATEGORY: 'category',
  POST: 'post'
});

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

function isEditor(user) {
  return user?.role === ROLES.EDITOR;
}

function matchesAuthor(user, resource) {
  if (!user || !resource) {
    return false;
  }

  const authorEmail = resource.authorEmail ?? resource.ownerEmail ?? resource.createdBy;
  return Boolean(authorEmail && user.email && authorEmail.toLowerCase() === user.email.toLowerCase());
}

export function canRead(user, resourceType = RESOURCE_TYPES.PUBLICATION) {
  if (!user) {
    return false;
  }

  switch (user.role) {
    case ROLES.ADMIN:
    case ROLES.EDITOR:
    case ROLES.VIEWER:
      return true;
    default:
      return false;
  }
}

export function canCreate(user, resourceType = RESOURCE_TYPES.PUBLICATION, resource = null) {
  if (!user) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (resourceType === RESOURCE_TYPES.PUBLICATION && isEditor(user)) {
    if (!resource) {
      return true;
    }
    return matchesAuthor(user, resource);
  }

  if (resourceType === RESOURCE_TYPES.POST && isEditor(user)) {
    if (!resource) {
      return true;
    }
    return matchesAuthor(user, resource);
  }

  return false;
}

export function canEdit(user, resourceType = RESOURCE_TYPES.PUBLICATION, resource = null) {
  if (!user) {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (resourceType === RESOURCE_TYPES.PUBLICATION && isEditor(user)) {
    return matchesAuthor(user, resource);
  }

  if (resourceType === RESOURCE_TYPES.POST && isEditor(user)) {
    return matchesAuthor(user, resource);
  }

  return false;
}

export function canPublish(user, resourceType = RESOURCE_TYPES.PUBLICATION, resource = null) {
  if (resourceType !== RESOURCE_TYPES.PUBLICATION && resourceType !== RESOURCE_TYPES.POST) {
    return false;
  }

  return isAdmin(user);
}

export function ensureReadAccess(user, resourceType = RESOURCE_TYPES.PUBLICATION) {
  if (!canRead(user, resourceType)) {
    throw new Error('El usuario no tiene permisos de lectura.');
  }
}

export function canManageUsers(user) {
  return isAdmin(user);
}

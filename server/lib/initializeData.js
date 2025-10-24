import { randomUUID } from 'crypto';
import { licensesStore, usersStore } from './stores.js';

function sanitizeString(value) {
  return typeof value === 'string' ? value : '';
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === 'string');
}

export async function initializeData() {
  await usersStore.update((users) => {
    const safeUsers = Array.isArray(users) ? users : [];
    let mutated = !Array.isArray(users);

    const normalized = safeUsers
      .filter((user) => user && typeof user === 'object')
      .map((user) => {
        const id = user.id ?? randomUUID();
        if (!user.id) {
          mutated = true;
        }
        return {
          id,
          email: sanitizeString(user.email),
          name: sanitizeString(user.name),
          picture: sanitizeString(user.picture),
          role: sanitizeString(user.role),
          createdAt: typeof user.createdAt === 'string' ? user.createdAt : new Date().toISOString(),
        };
      });

    if (normalized.length !== safeUsers.length) {
      mutated = true;
    }

    return mutated ? normalized : users;
  });

  await licensesStore.update((rawData) => {
    const safeData = rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : {};
    let mutated = safeData !== rawData;

    const nextData = {};

    for (const [category, items] of Object.entries(safeData)) {
      if (!Array.isArray(items)) {
        mutated = true;
        continue;
      }

      const cleanedItems = [];
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          mutated = true;
          continue;
        }
        const id = item.id ?? randomUUID();
        if (!item.id) {
          mutated = true;
        }
        cleanedItems.push({
          id,
          category,
          nombre: sanitizeString(item.nombre),
          licencia: sanitizeString(item.licencia),
          enlace: sanitizeString(item.enlace),
          logo: sanitizeString(item.logo),
          subHerramientas: sanitizeStringArray(item.subHerramientas),
          usos: sanitizeStringArray(item.usos),
        });
      }

      nextData[category] = cleanedItems;
    }

    return mutated ? nextData : rawData;
  });
}

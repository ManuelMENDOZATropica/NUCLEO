import Fuse from 'fuse.js';

let fuseInstance = null;
let rawIndex = [];

const options = {
  keys: ['title', 'description', 'tags'],
  includeScore: true,
  threshold: 0.4
};

export async function ensureSearchIndex() {
  if (fuseInstance) {
    return fuseInstance;
  }

  if (!rawIndex.length) {
    const response = await fetch('/search-index.json');
    if (!response.ok) {
      throw new Error('No se pudo cargar el índice de búsqueda.');
    }
    rawIndex = await response.json();
  }

  fuseInstance = new Fuse(rawIndex, options);
  return fuseInstance;
}

export async function searchContent(query) {
  if (!query?.trim()) {
    return [];
  }

  const fuse = await ensureSearchIndex();
  return fuse.search(query).map((result) => ({
    ...result.item,
    score: result.score
  }));
}

export function getRawIndex() {
  return rawIndex;
}

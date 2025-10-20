export function pathToSlug(filePath) {
  const normalized = filePath
    .replace(/\\/g, '/')
    .replace(/^\.\/?/, '')
    .replace(/^src\/content\//, '')
    .replace(/\.mdx$/, '');

  if (normalized === 'index') {
    return '';
  }

  if (normalized.endsWith('/index')) {
    return normalized.slice(0, -('/index'.length));
  }

  return normalized;
}

export function normalizeSlug(slug) {
  if (!slug) return '';
  return slug
    .replace(/\\/g, '/')
    .replace(/^\//, '')
    .replace(/\/$/, '');
}

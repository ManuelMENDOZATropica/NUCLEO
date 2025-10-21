import categories from '../../../data/categories.json';

export const CATEGORIES = categories;

export function getCategories(options = {}) {
  const { includeArchived = false } = options;
  if (includeArchived) {
    return CATEGORIES.slice();
  }

  return CATEGORIES.filter((category) => category.status !== 'archived');
}

export function getCategoryById(id) {
  if (!id) {
    return null;
  }

  const normalized = id.toLowerCase();
  return CATEGORIES.find((category) => category.id.toLowerCase() === normalized) ?? null;
}

export function getCategoryBySlug(slug) {
  if (!slug) {
    return null;
  }

  const normalized = slug.toLowerCase();
  return CATEGORIES.find((category) => category.slug.toLowerCase() === normalized) ?? null;
}

export function getCategoryOptions() {
  return getCategories().map((category) => ({
    value: category.id,
    label: category.name,
    slug: category.slug
  }));
}

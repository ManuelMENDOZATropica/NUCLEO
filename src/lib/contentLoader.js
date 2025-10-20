import { normalizeSlug, pathToSlug } from './slugify.js';

const mdxModules = import.meta.glob('../content/**/*.mdx', { eager: true });

const records = Object.entries(mdxModules)
  .map(([filePath, module]) => {
    const slug = pathToSlug(filePath);
    const frontmatter = module.frontmatter ?? {};
    const section = frontmatter.section ?? slug.split('/')[0] ?? '';

    return {
      id: slug || 'home',
      filePath,
      slug,
      title: frontmatter.title ?? 'Documento sin título',
      description: frontmatter.description ?? '',
      tags: frontmatter.tags ?? [],
      section,
      updatedAt: frontmatter.updatedAt ?? '',
      Component: module.default
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const contentMap = new Map(records.map((record) => [record.slug, record]));

export const contentIndex = records;

export function getContentBySlug(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return contentMap.get('') ?? null;
  }
  return contentMap.get(normalized) ?? null;
}

export function getSectionList() {
  const bySection = new Map();

  for (const record of records) {
    const sectionKey = record.section || 'general';
    if (!bySection.has(sectionKey)) {
      bySection.set(sectionKey, {
        key: sectionKey,
        title: sectionTitle(sectionKey),
        slug: sectionKey,
        items: []
      });
    }

    if (record.slug) {
      bySection.get(sectionKey).items.push(record);
    }
  }

  return Array.from(bySection.values()).map((section) => ({
    ...section,
    items: section.items.sort((a, b) => a.title.localeCompare(b.title))
  }));
}

function sectionTitle(key) {
  if (!key) return 'Inicio';
  const dictionary = {
    'recursos-ia': 'Recursos IA',
    rrhh: 'Recursos Humanos',
    inducciones: 'Inducciones',
    recursos: 'Recursos Generales'
  };

  return dictionary[key] ?? key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

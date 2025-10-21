import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { pathToSlug } from '../src/lib/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const contentDir = join(__dirname, '..', 'src', 'content');
  const files = await fg('**/*.mdx', {
    cwd: contentDir,
    absolute: true
  });

  const index = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const { data } = matter(raw);
    const relativePath = file.replace(contentDir + '/', '');
    const slug = pathToSlug(`src/content/${relativePath}`);

    index.push({
      slug,
      title: data.title ?? 'Documento sin título',
      description: data.description ?? '',
      tags: data.tags ?? [],
      section: data.section ?? slug.split('/')[0] ?? '',
      updatedAt: data.updatedAt ?? ''
    });
  }

  const dataDir = join(__dirname, '..', 'data');
  const publicationsDir = join(dataDir, 'publications');
  const publicationFiles = await fg('**/*.json', {
    cwd: publicationsDir,
    absolute: true
  });

  for (const file of publicationFiles) {
    const raw = await readFile(file, 'utf8');
    const publication = JSON.parse(raw);

    if (publication.status !== 'published') {
      continue;
    }

    index.push({
      type: 'publication',
      slug: publication.slug,
      title: publication.title ?? 'Publicación sin título',
      description: publication.summary ?? '',
      tags: publication.tags ?? [],
      section: publication.section ?? 'publicaciones',
      updatedAt: publication.updatedAt ?? publication.publishedAt ?? ''
    });
  }

  const postsDir = join(dataDir, 'posts');
  const postFiles = await fg('**/*.json', {
    cwd: postsDir,
    absolute: true
  });

  for (const file of postFiles) {
    const raw = await readFile(file, 'utf8');
    const post = JSON.parse(raw);

    if (post.status !== 'published') {
      continue;
    }

    index.push({
      type: 'category-post',
      slug: post.slug,
      title: post.title ?? 'Post sin título',
      description: post.summary ?? '',
      tags: [],
      section: 'categorias',
      updatedAt: post.updatedAt ?? post.publishedAt ?? ''
    });
  }

  const outputPath = join(__dirname, '..', 'public', 'search-index.json');
  await writeFile(outputPath, JSON.stringify(index, null, 2), 'utf8');
  console.log('Índice de búsqueda generado en', outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

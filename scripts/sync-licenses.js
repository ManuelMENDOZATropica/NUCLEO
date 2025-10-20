import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { csvToMdxTable } from '../src/lib/csvToMdx.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const csvPath = join(__dirname, '..', 'src', 'content', 'recursos-ia', 'licencias', 'catalogo.csv');
  const mdxPath = join(__dirname, '..', 'src', 'content', 'recursos-ia', 'licencias', 'catalogo.mdx');

  const csvContent = await readFile(csvPath, 'utf8');
  const mdxContent = csvToMdxTable(csvContent, {
    title: 'Catálogo de licencias',
    description: 'Listado actualizado de licencias de software utilizadas por TROPICA.'
  });

  await writeFile(mdxPath, mdxContent, 'utf8');
  console.log('Catálogo de licencias sincronizado en', mdxPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { parse } from 'csv-parse/sync';

export function csvToMdxTable(csvContent, { title = 'Catálogo de licencias', description = '' } = {}) {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true
  });

  const headers = ['Proveedor', 'Producto', 'Plan', 'Seats', 'Costo', 'Responsable', 'Renovación'];

  const rows = records.map((row) =>
    `| ${headers.map((header) => row[header] ?? '').join(' | ')} |`
  );

  const table = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows
  ].join('\n');

  return `---\ntitle: "${title}"\ndescription: "${description}"\ntags: ["licencias", "recursos-ia"]\nsection: "recursos-ia"\nupdatedAt: "${new Date().toISOString().slice(0, 10)}"\n---\n\n${table}\n`;
}

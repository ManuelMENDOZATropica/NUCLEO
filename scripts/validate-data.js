import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import fg from 'fast-glob';
import Ajv from 'ajv';
import { canCreate, canPublish, RESOURCE_TYPES, ROLES } from '../src/lib/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function formatAjvErrors(errors) {
  if (!errors?.length) {
    return [];
  }

  return errors.map((error) => {
    const path = error.instancePath ?? error.dataPath ?? '';
    const keyword = error.keyword ?? 'validation';
    return `${keyword} error at ${path || '/'}: ${error.message ?? 'valor inválido'}`;
  });
}

async function validateData() {
  const projectRoot = join(__dirname, '..');
  const dataDir = join(projectRoot, 'data');
  const schemaDir = join(projectRoot, 'schemas');

  const usersPath = join(dataDir, 'users.json');
  const users = await loadJson(usersPath);

  const metaSchema = await loadJson(join(schemaDir, 'meta/draft-07.schema.json'));
  const userSchema = await loadJson(join(schemaDir, 'user.schema.json'));
  const publicationSchema = await loadJson(join(schemaDir, 'publication.schema.json'));

  const ajv = new Ajv({ allErrors: true });
  ajv.addMetaSchema(metaSchema);
  const validateUser = ajv.compile(userSchema);
  const validatePublication = ajv.compile(publicationSchema);

  const errors = [];

  if (!Array.isArray(users)) {
    errors.push('El archivo users.json debe exportar un arreglo de usuarios.');
  }

  const userMap = new Map();

  for (const user of users) {
    if (!validateUser(user)) {
      const ajvMessages = formatAjvErrors(validateUser.errors);
      errors.push(
        `Usuario inválido (${user?.email ?? 'sin email'}): ${ajvMessages.join(', ')}`
      );
    }

    const email = user?.email?.toLowerCase();
    if (!email) {
      continue;
    }

    if (userMap.has(email)) {
      errors.push(`El correo ${user.email} está duplicado en users.json.`);
    } else {
      userMap.set(email, user);
    }
  }

  const requiredUsers = {
    'benjamin@tropica.me': ROLES.ADMIN,
    'manuel@tropica.me': ROLES.ADMIN,
    'micaela@tropica.me': ROLES.EDITOR
  };

  for (const [email, role] of Object.entries(requiredUsers)) {
    const user = userMap.get(email);
    if (!user) {
      errors.push(`Falta el usuario obligatorio con correo ${email}.`);
      continue;
    }

    if (user.role !== role) {
      errors.push(`El usuario ${email} debe tener el rol ${role}.`);
    }
  }

  const publicationsDir = join(dataDir, 'publications');
  const publicationFiles = await fg('**/*.json', {
    cwd: publicationsDir,
    absolute: true
  });

  for (const filePath of publicationFiles) {
    const publication = await loadJson(filePath);
    if (!validatePublication(publication)) {
      const ajvMessages = formatAjvErrors(validatePublication.errors);
      errors.push(
        `Publicación inválida (${relative(projectRoot, filePath)}): ${ajvMessages.join(', ')}`
      );
    }

    const author = userMap.get(publication.authorEmail?.toLowerCase() ?? '');
    if (!author) {
      errors.push(
        `La publicación ${publication.id} no tiene un autor registrado (${publication.authorEmail}).`
      );
      continue;
    }

    if (!canCreate(author, RESOURCE_TYPES.PUBLICATION, publication)) {
      errors.push(
        `El autor ${author.email} no tiene permisos para crear la publicación ${publication.id}.`
      );
    }

    if (publication.status === 'published') {
      if (!publication.publishedAt) {
        errors.push(
          `La publicación ${publication.id} está publicada pero no tiene fecha de publicación.`
        );
      }

      if (!canPublish(author, RESOURCE_TYPES.PUBLICATION, publication)) {
        errors.push(
          `El autor ${author.email} no tiene permisos para publicar ${publication.id}.`
        );
      }
    } else if (publication.publishedAt) {
      errors.push(
        `La publicación ${publication.id} no está publicada pero define publishedAt.`
      );
    }
  }

  if (errors.length) {
    console.error('Se encontraron errores al validar la base de datos JSON:');
    for (const error of errors) {
      console.error(' -', error);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Validación de datos completada correctamente.');
}

validateData().catch((error) => {
  console.error('Error inesperado durante la validación de datos.');
  console.error(error);
  process.exitCode = 1;
});

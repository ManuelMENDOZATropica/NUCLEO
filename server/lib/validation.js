import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'failing',
});

addFormats(ajv);

export const userCreateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'name', 'role'],
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1 },
    role: { type: 'string', minLength: 1 },
    picture: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const userUpdateSchema = userCreateSchema;

export const licenseCreateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'nombre', 'licencia', 'enlace', 'logo'],
  properties: {
    category: { type: 'string', minLength: 1 },
    nombre: { type: 'string', minLength: 1 },
    licencia: { type: 'string', minLength: 1 },
    enlace: { type: 'string', format: 'uri' },
    logo: { type: 'string', format: 'uri' },
    subHerramientas: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    usos: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
};

export const licenseUpdateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    category: { type: 'string', minLength: 1 },
    nombre: { type: 'string', minLength: 1 },
    licencia: { type: 'string', minLength: 1 },
    enlace: { type: 'string', format: 'uri' },
    logo: { type: 'string', format: 'uri' },
    subHerramientas: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    usos: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
  },
  minProperties: 1,
};

export function buildValidator(schema) {
  const validate = ajv.compile(schema);
  return (data) => ({ valid: validate(data), errors: validate.errors ?? [] });
}

export function formatErrors(errors) {
  return errors.map((error) => {
    const path = error.instancePath || error.schemaPath;
    return `${path} ${error.message}`.trim();
  });
}

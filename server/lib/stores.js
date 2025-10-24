import path from 'path';
import { fileURLToPath } from 'url';
import JsonFileStore from './jsonFileStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.resolve(ROOT_DIR, 'public', 'json-db');

export const usersStore = new JsonFileStore(path.resolve(DATA_DIR, 'users.json'), {
  defaultValue: [],
});

export const licensesStore = new JsonFileStore(path.resolve(DATA_DIR, 'licenses.json'), {
  defaultValue: {},
});

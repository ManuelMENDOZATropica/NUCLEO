import HttpError from './httpError.js';

export function findLicense(data, id) {
  for (const [category, items] of Object.entries(data)) {
    const index = items.findIndex((item) => item.id === id);
    if (index !== -1) {
      return { license: items[index], category, index };
    }
  }
  throw new HttpError(404, 'License not found');
}

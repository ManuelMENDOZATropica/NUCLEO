import { apiRequest } from './apiClient.js';

const COLLECTION_PATH = '/api/categories';

export async function listCategories() {
  return apiRequest(COLLECTION_PATH, { method: 'GET' });
}

export async function createCategory(payload) {
  return apiRequest(COLLECTION_PATH, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateCategory(id, payload) {
  return apiRequest(`${COLLECTION_PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteCategory(id) {
  return apiRequest(`${COLLECTION_PATH}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

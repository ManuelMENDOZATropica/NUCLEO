import { apiRequest } from './apiClient.js';

const COLLECTION_PATH = '/api/publications';

export async function listPublications() {
  return apiRequest(COLLECTION_PATH, { method: 'GET' });
}

export async function createPublication(payload) {
  return apiRequest(COLLECTION_PATH, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updatePublication(id, payload) {
  return apiRequest(`${COLLECTION_PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deletePublication(id) {
  return apiRequest(`${COLLECTION_PATH}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

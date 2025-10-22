import { apiRequest } from './apiClient.js';

const COLLECTION_PATH = '/api/posts';

export async function listPosts() {
  return apiRequest(COLLECTION_PATH, { method: 'GET' });
}

export async function createPost(payload) {
  return apiRequest(COLLECTION_PATH, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updatePost(id, payload) {
  return apiRequest(`${COLLECTION_PATH}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deletePost(id) {
  return apiRequest(`${COLLECTION_PATH}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

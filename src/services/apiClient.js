const DEFAULT_API_URL = 'http://localhost:5000';

function resolveBaseUrl() {
  const rawUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
  return rawUrl.replace(/\/$/, '');
}

export async function apiRequest(path, options = {}) {
  const baseUrl = resolveBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      const message = payload?.message ?? `Error ${response.status}`;
      throw new Error(message);
    }
    throw new Error(`Error ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

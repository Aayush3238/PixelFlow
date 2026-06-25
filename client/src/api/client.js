const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };
  const isRetry = options._retry;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !isRetry && localStorage.getItem('refreshToken') && path !== '/auth/refresh') {
    const refreshed = await auth.refresh(localStorage.getItem('refreshToken')).catch(() => null);
    if (refreshed?.token) {
      localStorage.setItem('token', refreshed.token);
      localStorage.setItem('refreshToken', refreshed.refreshToken);
      return request(path, { ...options, _retry: true });
    }
  }

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

function uploadRequest(path, formData, onProgress) {
  const token = localStorage.getItem('token');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading'));
    xhr.send(formData);
  });
}

export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  refresh: (refreshToken) => request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  me: () => request('/auth/me'),
  apiKeys: () => request('/auth/api-keys'),
  createApiKey: (name) => request('/auth/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteApiKey: (keyId) => request(`/auth/api-keys/${keyId}`, { method: 'DELETE' }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),
};

export const images = {
  upload: (file, options = {}, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    return uploadRequest('/images/upload', formData, onProgress);
  },
  batchUpload: (files, options = {}, onProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, value);
    });
    return uploadRequest('/images/batch-upload', formData, onProgress);
  },
  uploadUrl: (body) => request('/images/upload-url', { method: 'POST', body: JSON.stringify(body) }),
  folders: () => request('/images/folders'),
  tags: () => request('/images/tags'),
  list: ({ page = 1, limit = 20, q = '', tag = '', folder = '' } = {}) => {
    const params = new URLSearchParams({ page, limit });
    if (q) params.set('q', q);
    if (tag) params.set('tag', tag);
    if (folder) params.set('folder', folder);
    return request(`/images/library?${params}`);
  },
  get: (imageId) => request(`/images/${imageId}`),
  update: (imageId, body) => request(`/images/${imageId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  bulkDelete: (imageIds) => request('/images/bulk-delete', { method: 'POST', body: JSON.stringify({ imageIds }) }),
  delete: (imageId) => request(`/images/${imageId}`, { method: 'DELETE' }),
};

export const dashboard = {
  stats: () => request('/dashboard/stats'),
};

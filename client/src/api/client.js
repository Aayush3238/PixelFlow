const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
};

export const images = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return request('/images/upload', { method: 'POST', body: formData });
  },
  list: (page = 1) => request(`/images/library?page=${page}`),
  get: (imageId) => request(`/images/${imageId}`),
  delete: (imageId) => request(`/images/${imageId}`, { method: 'DELETE' }),
};

export const dashboard = {
  stats: () => request('/dashboard/stats'),
};

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const serverOrigin = API_URL.endsWith('/api')
  ? API_URL.slice(0, -4)
  : window.location.origin;

export const imageUrl = (imageId, params = '') =>
  `${serverOrigin}/i/${imageId}${params ? `?${params}` : ''}`;

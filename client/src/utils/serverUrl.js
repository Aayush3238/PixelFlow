const API_URL = import.meta.env.VITE_API_URL || '/api';

const getServerOrigin = () => {
  if (/^https?:\/\//i.test(API_URL)) {
    const url = new URL(API_URL);
    if (url.pathname.endsWith('/api')) {
      url.pathname = url.pathname.slice(0, -4) || '/';
    }
    url.search = '';
    url.hash = '';
    return url.origin + url.pathname.replace(/\/$/, '');
  }

  return window.location.origin;
};

export const serverOrigin = getServerOrigin();

export const imageUrl = (imageId, params = '') =>
  `${serverOrigin}/i/${imageId}${params ? `?${params}` : ''}`;

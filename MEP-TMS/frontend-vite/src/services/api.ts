import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem('token');
    const isMock = token && (token === 'mock-jwt-token-12345' || token.startsWith('mock-'));
    if (error.response?.status === 401 && !isMock) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Don't redirect if already on the login/signup page to avoid infinite reload loop
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/signup' && currentPath !== '/trainee-login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

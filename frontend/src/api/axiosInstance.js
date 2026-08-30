import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: {
    "Content-Type": "application/json",
  }
});

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeCompanyId = localStorage.getItem('activeCompanyId') || sessionStorage.getItem('activeCompanyId');
  if (activeCompanyId) config.headers['X-Company-Id'] = activeCompanyId;
  return config;
});

instance.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/forgot-password') || requestUrl.includes('/auth/reset-password');
    const hasToken = Boolean(localStorage.getItem('token') || sessionStorage.getItem('token'));

    if (status === 401 && hasToken && !isAuthEndpoint) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('memberCompanies');
      sessionStorage.removeItem('memberCompanies');
      localStorage.removeItem('activeCompanyId');
      sessionStorage.removeItem('activeCompanyId');
      localStorage.removeItem('companyPermissions');
      sessionStorage.removeItem('companyPermissions');
      localStorage.removeItem('companyRole');
      sessionStorage.removeItem('companyRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export default instance;
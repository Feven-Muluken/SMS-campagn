import axios from 'axios';

const defaultApiBaseUrl = import.meta.env.PROD
  ? 'https://afroel-sms-api.onrender.com'
  : 'http://localhost:5000';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  }
});

let refreshInProgress = null;

const sessionStorageArea = () =>
  localStorage.getItem('refreshToken') ? localStorage : sessionStorage;

const clearSession = () => {
  for (const storage of [localStorage, sessionStorage]) {
    ['token', 'refreshToken', 'memberCompanies', 'activeCompanyId',
      'companyPermissions', 'companyRole'].forEach((key) => storage.removeItem(key));
  }
};

const refreshSession = async () => {
  const storage = sessionStorageArea();
  const refreshToken = storage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const response = await axios.post(
    `${instance.defaults.baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  storage.setItem('token', response.data.token);
  storage.setItem('refreshToken', response.data.refreshToken);
  return response.data.token;
};

instance.interceptors.request.use(config => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const activeCompanyId = localStorage.getItem('activeCompanyId') || sessionStorage.getItem('activeCompanyId');
  if (activeCompanyId) config.headers['X-Company-Id'] = activeCompanyId;
  return config;
});

instance.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const isAuthEndpoint = requestUrl.includes('/auth/');
    const hasRefreshToken = Boolean(localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'));

    if (status === 401 && hasRefreshToken && !isAuthEndpoint && !error.config?._retriedAfterRefresh) {
      try {
        refreshInProgress ??= refreshSession().finally(() => { refreshInProgress = null; });
        const token = await refreshInProgress;
        error.config._retriedAfterRefresh = true;
        error.config.headers.Authorization = `Bearer ${token}`;
        return instance(error.config);
      } catch {
        clearSession();
        window.location.href = '/login';
      }
    } else if (status === 401 && !isAuthEndpoint) {
      clearSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export default instance;

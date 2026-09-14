import axios from 'axios';

const defaultApiBaseUrl = import.meta.env.PROD
  ? 'https://smsbackend-production-fc8c.up.railway.app'
  : 'http://localhost:5000';

/**
 * No auth header / no 401→login redirect. Use for forgot-password and reset-password only.
 */
const publicAuthClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

export default publicAuthClient;

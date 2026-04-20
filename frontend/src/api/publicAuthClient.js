import axios from 'axios';

/**
 * No auth header / no 401→login redirect. Use for forgot-password and reset-password only.
 */
const publicAuthClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

export default publicAuthClient;

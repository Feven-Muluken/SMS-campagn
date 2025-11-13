import { jwtDecode } from 'jwt-decode';

export const getUserFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

export const isAdmin = () => {
  const user = getUserFromToken();
  return user?.role == 'admin';
};

export const expiredToken = () => {
  const user = jwtDecode(token);
  const now = Date.now() / 1000;
  if (user.exp < now) {
    localStorage.removeItem('token');
    return true
  }
}
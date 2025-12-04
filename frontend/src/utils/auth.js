import jwtDecode from './jwtHelper';

export const getUserFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch {
    localStorage.removeItem('token');
    return null;
  }
};

// export const isAdmin = () => {
//   const user = getUserFromToken();
//   return user?.role === 'admin';
// };

// export const expiredToken = () => {
//   const token = localStorage.getItem('token');
//   if (!token) return true;

//   try {
//     const decoded = jwtDecode(token);
//     const now = Date.now() / 1000;
//     if (decoded.exp && decoded.exp < now) {
//       localStorage.removeItem('token');
//       return true;
//     }
//     return false;
//   } catch {
//     localStorage.removeItem('token');
//     return true;
//   }
// };

// should show { id, role, email, name, iat, exp }

// import { jwtDecode } from 'jwt-decode';

// export const getUserFromToken = () => {
//   const token = localStorage.getItem('token');
//   if (!token) return null;

//   try {
//     return jwtDecode(token);
//   } catch {
//     return null;
//   }
// };

// export const isAdmin = () => {
//   const user = getUserFromToken();
//   return user?.role == 'admin';
// };

// export const expiredToken = () => {
//   const user = jwtDecode(token);
//   const now = Date.now() / 1000;
//   if (user.exp < now) {
//     localStorage.removeItem('token');
//     return true
//   }
// }
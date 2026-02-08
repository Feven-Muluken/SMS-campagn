/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import jwtDecode from '../utils/jwtHelper';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) { 
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (decoded.exp < now) {
        localStorage.removeItem('token');
        setUser(null);
      } else {
        setUser(decoded);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserFromToken();
  }, []);

  const refreshUser = () => {
    setLoading(true);
    loadUserFromToken();
  };

  return <UserContext.Provider value={{ user, setUser, loading, refreshUser }}>
    {children}
  </UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
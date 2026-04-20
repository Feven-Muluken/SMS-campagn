/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import jwtDecode from '../utils/jwtHelper';
import { canAccess } from '../utils/permissions';

const UserContext = createContext();

const parseJsonArray = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseMemberCompanies = (raw) => {
  const parsed = parseJsonArray(raw);
  return parsed.every((x) => x && typeof x === 'object' && 'companyId' in x) ? parsed : [];
};

const getActiveStorage = () => {
  if (localStorage.getItem('token')) return localStorage;
  if (sessionStorage.getItem('token')) return sessionStorage;
  return localStorage;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromToken = () => {
    const tokenStorage = localStorage.getItem('token') ? localStorage : sessionStorage;
    const token = tokenStorage.getItem('token');
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
        sessionStorage.removeItem('token');
        setUser(null);
      } else {
        const activeCompanyId =
          Number(tokenStorage.getItem('activeCompanyId')) ||
          Number(decoded.activeCompanyId) ||
          null;
        const companyPermissionsFromStorage = parseJsonArray(tokenStorage.getItem('companyPermissions'));
        const companyPermissions =
          Array.isArray(decoded.companyPermissions) && decoded.companyPermissions.length
            ? decoded.companyPermissions
            : companyPermissionsFromStorage;

        const availableCompanies = parseMemberCompanies(tokenStorage.getItem('memberCompanies'));

        setUser({
          ...decoded,
          activeCompanyId,
          companyRole: tokenStorage.getItem('companyRole') || decoded.companyRole || null,
          companyPermissions,
          availableCompanies,
        });
      }
    } catch {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
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

  const setCompanyContext = ({ activeCompanyId, companyRole, companyPermissions = [], companies }) => {
    const storage = getActiveStorage();
    if (activeCompanyId) {
      storage.setItem('activeCompanyId', String(activeCompanyId));
    } else {
      storage.removeItem('activeCompanyId');
    }

    if (companyRole) {
      storage.setItem('companyRole', String(companyRole));
    } else {
      storage.removeItem('companyRole');
    }

    storage.setItem('companyPermissions', JSON.stringify(Array.isArray(companyPermissions) ? companyPermissions : []));

    if (companies !== undefined) {
      if (Array.isArray(companies) && companies.length) {
        storage.setItem('memberCompanies', JSON.stringify(companies));
      } else {
        storage.removeItem('memberCompanies');
      }
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            activeCompanyId: activeCompanyId || null,
            companyRole: companyRole || null,
            companyPermissions: Array.isArray(companyPermissions) ? companyPermissions : [],
            ...(companies !== undefined
              ? { availableCompanies: Array.isArray(companies) ? companies : [] }
              : {}),
          }
        : prev
    );
  };

  const hasPermission = (permissionKey) => {
    if (!permissionKey) return true;
    if ((user?.role || '').toLowerCase() === 'admin') return true;
    return canAccess(user, permissionKey);
  };

  return <UserContext.Provider value={{ user, setUser, loading, refreshUser, setCompanyContext, hasPermission }}>
    {children}
  </UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
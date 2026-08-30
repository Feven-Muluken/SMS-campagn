import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const normalizeRoles = (role) => (Array.isArray(role) ? role : role ? [role] : []);

const ProtectedRoute = ({ children, role, permission, allowCompanyWorkspace, deniedTo }) => {
  const { user, loading, hasPermission } = useUser();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-[30vh] flex items-center justify-center text-sm text-gray-500">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = normalizeRoles(role).map((r) => String(r).toLowerCase());
  if (allowedRoles.length && !allowedRoles.includes(String(user.role || '').toLowerCase())) {
    return <Navigate to="/unauthorized" replace />;
  }

  const isPlatformAdmin = String(user.role || '').toLowerCase() === 'admin';
  if (allowCompanyWorkspace && !isPlatformAdmin) {
    const activeId = Number(user.activeCompanyId);
    const profileOnly = location.pathname === '/profile';
    if ((!activeId || !Number.isFinite(activeId)) && !profileOnly) {
      return <Navigate to="/companyhome" replace />;
    }
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={deniedTo || '/unauthorized'} replace />;
  }

  return children;
};

export default ProtectedRoute;

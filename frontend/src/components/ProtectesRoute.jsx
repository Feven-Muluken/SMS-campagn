import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const normalizeRoles = (role) => (Array.isArray(role) ? role : role ? [role] : []);

const ProtectedRoute = ({ children, role, permission }) => {
  const { user, loading, hasPermission } = useUser();

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

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;

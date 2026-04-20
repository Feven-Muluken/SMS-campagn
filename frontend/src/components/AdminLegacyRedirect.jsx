import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/** Old /admin URL: superadmin → platform hub, everyone else → workspace. */
const AdminLegacyRedirect = () => {
  const { user, loading } = useUser();
  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-gray-500 text-sm">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (String(user.role || '').toLowerCase() === 'admin') {
    return <Navigate to="/platform" replace />;
  }
  return <Navigate to="/" replace />;
};

export default AdminLegacyRedirect;

import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PlatformLayout from '../layouts/PlatformLayout';

/** Superadmin-only shell; other roles go to workspace (no scary unauthorized page). */
const PlatformShell = () => {
  const { user, loading } = useUser();
  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-gray-500 text-sm">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (String(user.role || '').toLowerCase() !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <PlatformLayout />;
};

export default PlatformShell;

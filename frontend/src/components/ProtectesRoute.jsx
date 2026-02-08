import { Navigate, useLocation } from "react-router-dom";
// import { isAdmin, expiredToken } from "../utils/auth";
import { useUser } from "../context/UserContext";
// import { BoldIcon } from "@heroicons/react/24/outline";

const ProtectedRoute = ({ children, role }) => {
  const location = useLocation();
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  const requiredRoles = role ? (Array.isArray(role) ? role : [role]) : null;
  if (requiredRoles) {
    const normalizedUserRole = (user.role || '').toLowerCase();
    const allowed = requiredRoles
      .map(r => (r || '').toLowerCase())
      .includes(normalizedUserRole);

    if (!allowed) return <Navigate to="/unauthorized" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
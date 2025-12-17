import { Navigate } from "react-router-dom";
// import { isAdmin, expiredToken } from "../utils/auth";
import { useUser } from "../context/UserContext";
// import { BoldIcon } from "@heroicons/react/24/outline";

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;
  const allowed = []
    .concat(role)
    .map(r => r.toLowerCase())
    .includes(user.role.toLowerCase());
    
  if (role && !allowed){
    return <Navigate to="/unauthorized" replace />
    
  };

  return children;
};

export default ProtectedRoute;
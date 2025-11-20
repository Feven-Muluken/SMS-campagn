import { Navigate } from "react-router-dom";
// import { isAdmin, expiredToken } from "../utils/auth";
import { useUser } from "../context/UserContext";
// import { BoldIcon } from "@heroicons/react/24/outline";
 
const ProtectedRoute = ({ children, role }) => {
  const { user } = useUser();
  if (!user) return <Navigate to="/login"/>;
  if (role && user.role !== role) return <Navigate to="/unauthorized"/>
  return children
  // return (isAdmin & expiredToken)? children : <Navigate to='/login'/>;
};

export default ProtectedRoute;
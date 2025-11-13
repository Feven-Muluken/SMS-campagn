import { Navigate } from "react-router-dom";
import { isAdmin, expiredToken } from "../utils/auth";
import { useUser } from "../context/UserContext";

const ProtectedRoute = ({ children }) => {
  const { user } = useUser();
  if (!user) return <Navigate to="/login"/>;
  if (role && user.role != role) return <Navigate to="/login"/>
  // return children
  // return (isAdmin & expiredToken)? children : <Navigate to='/login'/>;
};

export default ProtectedRoute;
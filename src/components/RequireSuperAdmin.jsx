import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireSuperAdmin({ children }) {
  const { token, isSuperAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
}

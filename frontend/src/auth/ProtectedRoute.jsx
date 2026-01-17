import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, booting } = useAuth();

    if (booting) {
        return <p style={{ padding: 24 }}>Checking session…</p>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

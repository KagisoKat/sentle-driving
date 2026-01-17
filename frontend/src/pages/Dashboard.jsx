import { useAuth } from "../auth/AuthContext.jsx";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="card">
            <h2>Dashboard</h2>
            <p>Welcome, {user.email}</p>
            <p>Role: {user.role}</p>

            <button onClick={logout}>Logout</button>
        </div>
    );
}

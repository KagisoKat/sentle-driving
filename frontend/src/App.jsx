import { Routes, Route, Link } from "react-router-dom";
import Health from "./pages/Health.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Lessons from "./pages/Lessons.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { useAuth } from "./auth/AuthContext.jsx";

export default function App() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="app">
            <header className="header">
                <h1>Sentle-driving</h1>

                <nav className="nav">
                    <Link to="/">Home</Link>
                    <Link to="/health">API Health</Link>
                    <Link to="/login">Login</Link>
                    {isAuthenticated && <Link to="/dashboard">Dashboard</Link>}
                    {isAuthenticated && <Link to="/lessons">Lessons</Link>}
                </nav>
            </header>

            <main className="main">
                <Routes>
                    <Route path="/" element={<p>Home</p>} />
                    <Route path="/health" element={<Health />} />
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/lessons"
                        element={
                            <ProtectedRoute>
                                <Lessons />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </main>
        </div>
    );
}

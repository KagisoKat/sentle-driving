import { Routes, Route, Link } from "react-router-dom";
import Health from "./pages/Health.jsx";

export default function App() {
    return (
        <div className="app">
            <header className="header">
                <h1>Sentle-driving</h1>

                <nav className="nav">
                    <Link to="/">Home</Link>
                    <Link to="/health">API Health</Link>
                </nav>
            </header>

            <main className="main">
                <Routes>
                    <Route
                        path="/"
                        element={
                            <div className="card">
                                <h2>Welcome</h2>
                                <p>
                                    Frontend is running. This is the foundation for the driving
                                    school dashboard.
                                </p>
                            </div>
                        }
                    />

                    <Route path="/health" element={<Health />} />
                </Routes>
            </main>
        </div>
    );
}

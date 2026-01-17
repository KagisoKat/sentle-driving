import { useState } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        try {
            await login(email, password);
            navigate("/dashboard");
        } catch {
            setError("Invalid email or password");
        }
    }

    return (
        <div className="card" style={{ maxWidth: 400, margin: "40px auto" }}>
            <h2>Login</h2>

            {error && <p className="error">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%" }}
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: "100%" }}
                    />
                </div>

                <button type="submit">Login</button>
            </form>
        </div>
    );
}

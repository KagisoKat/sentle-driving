import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [accessToken, setAccessToken] = useState(null);
    const [user, setUser] = useState(null);
    const [booting, setBooting] = useState(true);

    async function login(email, password) {
        const res = await api.post("/auth/login", { email, password });
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
    }

    async function logout() {
        await api.post("/auth/logout", {});
        setAccessToken(null);
        setUser(null);
    }

    // Called on app start to silently refresh login
    async function boot() {
        try {
            const refreshRes = await api.post("/auth/refresh", {});
            const newToken = refreshRes.data.accessToken;
            setAccessToken(newToken);

            // fetch user identity using the new token
            const meRes = await api.get("/me", {
                headers: { Authorization: `Bearer ${newToken}` }
            });

            setUser({ id: meRes.data.user.id, role: meRes.data.user.role });
        } catch {
            setAccessToken(null);
            setUser(null);
        } finally {
            setBooting(false);
        }
    }

    useEffect(() => {
        boot();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                user,
                booting,
                isAuthenticated: Boolean(accessToken),
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

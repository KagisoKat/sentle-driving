import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Health() {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const res = await api.get("/health/db");
                setData(res.data);
            } catch {
                setError("Failed to reach backend. Check API container and CORS.");
            }
        }
        load();
    }, []);

    return (
        <div className="card">
            <h2>Backend connectivity</h2>

            {error && <p className="error">{error}</p>}
            {!error && !data && <p>Checking backend status...</p>}

            {data && (
                <>
                    <p className="success">Backend and database are reachable.</p>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </>
            )}
        </div>
    );
}

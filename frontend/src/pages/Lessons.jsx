import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Lessons() {
    const { accessToken, user } = useAuth();

    const [lessons, setLessons] = useState([]);
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");

    // Form state (only staff can schedule)
    const [studentId, setStudentId] = useState("");
    const [instructorId, setInstructorId] = useState("");
    const [vehicleId, setVehicleId] = useState("");
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");

    async function loadLessons() {
        setError("");
        const res = await api.get("/lessons?limit=50", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setLessons(res.data.lessons);
    }

    useEffect(() => {
        loadLessons().catch(() => setError("Failed to load lessons"));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function scheduleLesson(e) {
        e.preventDefault();
        setError("");
        setMsg("");

        try {
            const body = {
                studentId: studentId.trim(),
                instructorId: instructorId.trim(),
                vehicleId: vehicleId ? vehicleId.trim() : null,
                startsAt: startsAt.trim(),
                endsAt: endsAt.trim()
            };

            const res = await api.post("/lessons", body, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            setMsg("Lesson scheduled.");
            setLessons((prev) => [res.data.lesson, ...prev]); // optimistic add
        } catch (e2) {
            const apiError = e2?.response?.data?.error;
            // Handle validation errors (Zod returns an object)
            if (typeof apiError === "object") {
                setError(JSON.stringify(apiError, null, 2));
            } else {
                setError(apiError || "Failed to schedule lesson");
            }
        }
    }

    const isStaff = user?.role === "admin" || user?.role === "instructor";

    return (
        <div>
            <div className="card">
                <h2>Lessons</h2>
                {msg && <p className="success">{msg}</p>}
                {error && <p className="error">{error}</p>}
            </div>

            {isStaff && (
                <div className="card">
                    <h3>Schedule a lesson</h3>

                    <p style={{ opacity: 0.8 }}>
                        Paste IDs from the database for now. Next we will build pickers.
                    </p>

                    <form onSubmit={scheduleLesson}>
                        <div style={{ display: "grid", gap: 10 }}>
                            <input
                                placeholder="Student ID (uuid)"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                required
                            />
                            <input
                                placeholder="Instructor ID (uuid)"
                                value={instructorId}
                                onChange={(e) => setInstructorId(e.target.value)}
                                required
                            />
                            <input
                                placeholder="Vehicle ID (uuid) optional"
                                value={vehicleId}
                                onChange={(e) => setVehicleId(e.target.value)}
                            />
                            <input
                                placeholder="Starts At (ISO e.g. 2026-01-17T14:00:00+02:00)"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                required
                            />
                            <input
                                placeholder="Ends At (ISO e.g. 2026-01-17T15:00:00+02:00)"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                required
                            />

                            <button type="submit">Schedule</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <h3>Recent lessons</h3>

                {lessons.length === 0 ? (
                    <p>No lessons found.</p>
                ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {lessons.map((l) => (
                            <li key={l.id} style={{ marginBottom: 10 }}>
                                <div>
                                    <strong>{l.status}</strong> — {new Date(l.starts_at).toLocaleString()} →{" "}
                                    {new Date(l.ends_at).toLocaleString()}
                                </div>
                                <div style={{ opacity: 0.85, fontSize: 13 }}>
                                    lesson: {l.id}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

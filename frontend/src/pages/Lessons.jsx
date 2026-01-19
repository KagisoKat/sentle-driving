import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function localDateTimeToISO(value) {
    // value format from datetime-local: "YYYY-MM-DDTHH:MM"
    if (!value) return "";

    const [datePart, timePart] = value.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = timePart.split(":").map(Number);

    // Create a Date using LOCAL time components, then convert to ISO (UTC)
    const dt = new Date(y, m - 1, d, hh, mm, 0);
    return dt.toISOString();
}

export default function Lessons() {
    const { accessToken, user } = useAuth();

    const [lessons, setLessons] = useState([]);
    const [error, setError] = useState("");
    const [msg, setMsg] = useState("");

    // Form state (only staff can schedule)
    const [studentId, setStudentId] = useState("");
    const [instructorId, setInstructorId] = useState("");
    const [vehicleId, setVehicleId] = useState("");
    const [startsAtLocal, setStartsAtLocal] = useState("");
    const [endsAtLocal, setEndsAtLocal] = useState("");

    const [students, setStudents] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    async function loadLessons() {
        setError("");
        const res = await api.get("/lessons?limit=50", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        setLessons(res.data.lessons);
    }

    const isStaff = user?.role === "admin" || user?.role === "instructor";

    useEffect(() => {
        loadLessons().catch(() => setError("Failed to load lessons"));

        if (isStaff) {
            Promise.all([
                api.get("/catalog/students", { headers: { Authorization: `Bearer ${accessToken}` } }),
                api.get("/catalog/instructors", { headers: { Authorization: `Bearer ${accessToken}` } }),
                api.get("/catalog/vehicles", { headers: { Authorization: `Bearer ${accessToken}` } })
            ])
                .then(([s, i, v]) => {
                    setStudents(s.data.students);
                    setInstructors(i.data.instructors);
                    setVehicles(v.data.vehicles);
                })
                .catch(() => setError("Failed to load dropdown data"));
        }
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
                startsAt: localDateTimeToISO(startsAtLocal),
                endsAt: localDateTimeToISO(endsAtLocal)
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

                    <form onSubmit={scheduleLesson}>
                        <div style={{ display: "grid", gap: 10 }}>
                            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
                                <option value="">Select student...</option>
                                {students.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name} ({s.email})
                                    </option>
                                ))}
                            </select>

                            <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required>
                                <option value="">Select instructor...</option>
                                {instructors.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.full_name} ({i.email})
                                    </option>
                                ))}
                            </select>

                            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                                <option value="">Select vehicle (optional)...</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.make} {v.model} ({v.registration_number})
                                    </option>
                                ))}
                            </select>

                            <input
                                type="datetime-local"
                                value={startsAtLocal}
                                onChange={(e) => setStartsAtLocal(e.target.value)}
                                required
                            />
                            <input
                                type="datetime-local"
                                value={endsAtLocal}
                                onChange={(e) => setEndsAtLocal(e.target.value)}
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
                    <div style={{ display: "grid", gap: 12 }}>
                        {lessons.map((l) => (
                            <div key={l.id} className="card" style={{ marginBottom: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{l.status}</div>
                                        <div style={{ opacity: 0.85 }}>
                                            {new Date(l.starts_at).toLocaleString()} → {new Date(l.ends_at).toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: "right", opacity: 0.8, fontSize: 13 }}>
                                        <div>Lesson ID</div>
                                        <div style={{ fontFamily: "monospace" }}>{l.id}</div>
                                    </div>
                                </div>

                                <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "12px 0" }} />

                                <div style={{ display: "grid", gap: 6 }}>
                                    <div>
                                        <strong>Student:</strong> {l.student_name}
                                    </div>
                                    <div>
                                        <strong>Instructor:</strong> {l.instructor_name}
                                    </div>
                                    <div>
                                        <strong>Vehicle:</strong> {l.vehicle_label || "No vehicle assigned"}
                                    </div>
                                    {l.notes && (
                                        <div>
                                            <strong>Notes:</strong> {l.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

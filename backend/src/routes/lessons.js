import express from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

/**
 * We accept ISO strings from the frontend, store as timestamptz.
 */
const createLessonSchema = z.object({
    studentId: z.string().uuid(),
    instructorId: z.string().uuid(),
    vehicleId: z.string().uuid().nullable().optional(),
    startsAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid datetime"
    }),
    endsAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid datetime"
    }),
    notes: z.string().max(500).optional()
});

function isStaff(role) {
    return role === "admin" || role === "instructor";
}

/**
 * GET /lessons
 * - admin: all lessons
 * - instructor: lessons where instructor.user_id = req.user.id
 * - student: lessons where student.user_id = req.user.id
 */
router.get("/", requireAuth, async (req, res) => {
    const role = req.user.role;

    // Basic pagination (keeps endpoints safe)
    const limit = Math.min(Number(req.query.limit || 50), 100);

    if (role === "admin") {
        const r = await pool.query(
            `SELECT
               l.id,
               l.starts_at, l.ends_at, l.status, l.notes,

               s.id AS student_id,
               s.full_name AS student_name,

               i.id AS instructor_id,
               i.full_name AS instructor_name,

               v.id AS vehicle_id,
               CONCAT(v.make, ' ', v.model, ' (', v.registration_number, ')') AS vehicle_label

             FROM lessons l
             JOIN students s ON s.id = l.student_id
             JOIN instructors i ON i.id = l.instructor_id
             LEFT JOIN vehicles v ON v.id = l.vehicle_id

             ORDER BY l.starts_at DESC
             LIMIT $1`,
            [limit]
        );
        return res.json({ ok: true, lessons: r.rows });
    }

    if (role === "instructor") {
        const r = await pool.query(
            `SELECT
               l.id,
               l.starts_at, l.ends_at, l.status, l.notes,

               s.id AS student_id,
               s.full_name AS student_name,

               i.id AS instructor_id,
               i.full_name AS instructor_name,

               v.id AS vehicle_id,
               CONCAT(v.make, ' ', v.model, ' (', v.registration_number, ')') AS vehicle_label

             FROM lessons l
             JOIN instructors i ON i.id = l.instructor_id
             JOIN students s ON s.id = l.student_id
             LEFT JOIN vehicles v ON v.id = l.vehicle_id

             WHERE i.user_id = $1
             ORDER BY l.starts_at DESC
             LIMIT $2`,
            [req.user.id, limit]
        );
        return res.json({ ok: true, lessons: r.rows });
    }

    // student
    const r = await pool.query(
        `SELECT
           l.id,
           l.starts_at, l.ends_at, l.status, l.notes,

           s.id AS student_id,
           s.full_name AS student_name,

           i.id AS instructor_id,
           i.full_name AS instructor_name,

           v.id AS vehicle_id,
           CONCAT(v.make, ' ', v.model, ' (', v.registration_number, ')') AS vehicle_label

         FROM lessons l
         JOIN students s ON s.id = l.student_id
         JOIN instructors i ON i.id = l.instructor_id
         LEFT JOIN vehicles v ON v.id = l.vehicle_id

         WHERE s.user_id = $1
         ORDER BY l.starts_at DESC
         LIMIT $2`,
        [req.user.id, limit]
    );

    return res.json({ ok: true, lessons: r.rows });
});

/**
 * POST /lessons
 * Only admin/instructor can schedule.
 */
router.post("/", requireAuth, async (req, res) => {
    if (!isStaff(req.user.role)) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const parsed = createLessonSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const { studentId, instructorId, vehicleId, startsAt, endsAt, notes } = parsed.data;

    // Simple correctness check before DB constraint (friendly error)
    if (new Date(endsAt) <= new Date(startsAt)) {
        return res.status(400).json({ ok: false, error: "endsAt must be after startsAt" });
    }

    try {
        const insert = await pool.query(
            `INSERT INTO lessons (student_id, instructor_id, vehicle_id, starts_at, ends_at, status, notes)
             VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
             RETURNING id`,
            [studentId, instructorId, vehicleId ?? null, startsAt, endsAt, notes ?? null]
        );

        const lessonId = insert.rows[0].id;

        const full = await pool.query(
            `SELECT
               l.id,
               l.starts_at, l.ends_at, l.status, l.notes,

               s.id AS student_id,
               s.full_name AS student_name,

               i.id AS instructor_id,
               i.full_name AS instructor_name,

               v.id AS vehicle_id,
               CONCAT(v.make, ' ', v.model, ' (', v.registration_number, ')') AS vehicle_label

             FROM lessons l
             JOIN students s ON s.id = l.student_id
             JOIN instructors i ON i.id = l.instructor_id
             LEFT JOIN vehicles v ON v.id = l.vehicle_id

             WHERE l.id = $1`,
            [lessonId]
        );

        return res.status(201).json({ ok: true, lesson: full.rows[0] });
    } catch (e) {
        // Exclusion constraint violation -> double booking
        if (String(e).includes("lessons_no_overlap_instructor")) {
            return res.status(409).json({ ok: false, error: "Instructor is already booked for that time" });
        }
        if (String(e).includes("lessons_no_overlap_vehicle")) {
            return res.status(409).json({ ok: false, error: "Vehicle is already booked for that time" });
        }

        console.error(e);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

export default router;

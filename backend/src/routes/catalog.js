import express from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

/**
 * GET /catalog/students
 * Staff only (admin/instructor) because they schedule lessons.
 */
router.get("/students", requireAuth, async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "instructor") {
        return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const r = await pool.query(
        `SELECT s.id, s.full_name, u.email
     FROM students s
     JOIN users u ON u.id = s.user_id
     ORDER BY s.full_name ASC
     LIMIT 200`
    );

    return res.json({ ok: true, students: r.rows });
});

/**
 * GET /catalog/instructors
 * Staff only.
 */
router.get("/instructors", requireAuth, async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "instructor") {
        return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const r = await pool.query(
        `SELECT i.id, i.full_name, u.email
     FROM instructors i
     JOIN users u ON u.id = i.user_id
     ORDER BY i.full_name ASC
     LIMIT 200`
    );

    return res.json({ ok: true, instructors: r.rows });
});

/**
 * GET /catalog/vehicles
 * Staff only.
 */
router.get("/vehicles", requireAuth, async (req, res) => {
    if (req.user.role !== "admin" && req.user.role !== "instructor") {
        return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const r = await pool.query(
        `SELECT id, make, model, registration_number, is_active
     FROM vehicles
     WHERE is_active = true
     ORDER BY make ASC, model ASC
     LIMIT 200`
    );

    return res.json({ ok: true, vehicles: r.rows });
});

export default router;

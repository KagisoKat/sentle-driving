import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import crypto from "crypto";

const router = express.Router();

/**
 * Zod schemas = input rules.
 * If input violates rules, we reject early.
 */
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["admin", "instructor", "student"]),
    fullName: z.string().min(2)
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

function signAccessToken(payload) {
    const secret = process.env.JWT_ACCESS_SECRET;
    const ttl = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);

    return jwt.sign(payload, secret, { expiresIn: ttl });
}

function signRefreshToken(payload) {
    const secret = process.env.JWT_REFRESH_SECRET;
    const ttl = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 604800);

    return jwt.sign(payload, secret, { expiresIn: ttl });
}

function hashToken(token) {
    // Hash refresh token before storing (security best practice)
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST /auth/register
 * Creates a user and role profile.
 */
router.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const { email, password, role, fullName } = parsed.data;

    // bcrypt = slow hashing (defends brute force)
    const passwordHash = await bcrypt.hash(password, 12);

    // Transaction: user + profile must succeed together
    await pool.query("BEGIN");
    try {
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
            [email, passwordHash, role]
        );

        const user = userResult.rows[0];

        if (role === "student") {
            await pool.query(
                `INSERT INTO students (user_id, full_name) VALUES ($1, $2)`,
                [user.id, fullName]
            );
        }

        if (role === "instructor") {
            await pool.query(
                `INSERT INTO instructors (user_id, full_name) VALUES ($1, $2)`,
                [user.id, fullName]
            );
        }

        await pool.query("COMMIT");

        return res.status(201).json({ ok: true, user });
    } catch (e) {
        await pool.query("ROLLBACK");

        // Unique email violation is common
        if (String(e).includes("users_email_key")) {
            return res.status(409).json({ ok: false, error: "Email already in use" });
        }

        console.error(e);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

/**
 * POST /auth/login
 * Verifies credentials, issues access token + refresh cookie.
 */
router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const userResult = await pool.query(
        `SELECT id, email, role, password_hash FROM users WHERE email = $1`,
        [email]
    );

    const user = userResult.rows[0];
    if (!user) {
        return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

    // Store hashed refresh token in DB (revocable)
    const tokenHash = hashToken(refreshToken);
    const ttlSeconds = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 604800);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
    );

    // httpOnly cookie: JS cannot read it (reduces XSS token theft)
    res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // dev only; in prod behind HTTPS set true
        path: "/auth/refresh",
    });

    return res.json({
        ok: true,
        accessToken,
        user: { id: user.id, email: user.email, role: user.role },
    });
});

/**
 * POST /auth/refresh
 * Uses refresh token cookie to issue a new access token.
 */
router.post("/refresh", async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (!token) {
        return res.status(401).json({ ok: false, error: "Missing refresh token" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

        const tokenHash = hashToken(token);

        const r = await pool.query(
            `SELECT id, user_id, revoked_at, expires_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
            [tokenHash]
        );

        const row = r.rows[0];
        if (!row) return res.status(401).json({ ok: false, error: "Invalid refresh token" });
        if (row.revoked_at) return res.status(401).json({ ok: false, error: "Token revoked" });
        if (new Date(row.expires_at) < new Date()) return res.status(401).json({ ok: false, error: "Token expired" });

        const accessToken = signAccessToken({ sub: payload.sub, role: payload.role });
        return res.json({ ok: true, accessToken });
    } catch {
        return res.status(401).json({ ok: false, error: "Invalid refresh token" });
    }
});

/**
 * POST /auth/logout
 * Revokes the refresh token (server-side) and clears cookie.
 */
router.post("/logout", async (req, res) => {
    const token = req.cookies?.refresh_token;
    if (token) {
        const tokenHash = hashToken(token);
        await pool.query(
            `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`,
            [tokenHash]
        );
    }

    res.clearCookie("refresh_token", { path: "/auth/refresh" });
    return res.json({ ok: true });
});

export default router;

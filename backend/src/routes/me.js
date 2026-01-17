import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * Middleware: verifies the access token from Authorization header.
 * If valid, attaches payload to req.user.
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ ok: false, error: "Missing access token" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = payload;
        return next();
    } catch {
        return res.status(401).json({ ok: false, error: "Invalid/expired token" });
    }
}

/**
 * GET /me
 * Returns the current user's identity (from token).
 */
router.get("/", requireAuth, (req, res) => {
    return res.json({
        ok: true,
        user: {
            id: req.user.sub,
            role: req.user.role
        }
    });
});

export default router;

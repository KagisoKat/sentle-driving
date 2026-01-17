import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ ok: false, error: "Missing access token" });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = { id: payload.sub, role: payload.role };
        return next();
    } catch {
        return res.status(401).json({ ok: false, error: "Invalid/expired token" });
    }
}

import express from "express";
import helmet from "helmet";
import cors from "cors";
import pg from "pg";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import lessonsRoutes from "./routes/lessons.js";
import catalogRoutes from "./routes/catalog.js";

const { Pool } = pg;

const app = express();

/**
 * Middleware = functions that run for every request (or specific routes).
 * Think: request comes in -> middleware stack -> route handler -> response.
 */
app.use(helmet());

app.use(
    cors({
        origin: ["http://localhost:5173"],
        credentials: true,
    })
);

app.use(express.json());

app.use(cookieParser());

/**
 * DATABASE_URL will come from docker-compose (environment variables).
 * In containers, we connect to Postgres using the service name "db".
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.use("/auth", authRoutes);
app.use("/me", meRoutes);
app.use("/lessons", lessonsRoutes);
app.use("/catalog", catalogRoutes);

/**
 * Health endpoint (used by humans and by load balancers later).
 * If this works, the API is alive.
 */
app.get("/health", (req, res) => {
    res.json({ ok: true, service: "sentle-driving-backend" });
});

/**
 * DB health endpoint.
 * Proves the API can reach Postgres across the Docker network.
 */
app.get("/health/db", async (req, res) => {
    const result = await pool.query("SELECT now() as now");
    res.json({ ok: true, dbTime: result.rows[0].now });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`API listening on :${PORT}`);
});

import fs from "fs";
import path from "path";
import pg from "pg";

const { Pool } = pg;

const MIGRATIONS_DIR = path.resolve("migrations");

function listSqlFiles() {
    return fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith(".sql"))
        .sort(); // important: runs 001, then 002, etc.
}

async function ensureMigrationsTable(pool) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function hasMigration(pool, id) {
    const r = await pool.query("SELECT 1 FROM schema_migrations WHERE id = $1", [id]);
    return r.rowCount > 0;
}

async function applyMigration(pool, id, sql) {
    // Run the SQL, then record it as applied.
    await pool.query("BEGIN");
    try {
        await pool.query(sql);
        await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
        await pool.query("COMMIT");
    } catch (e) {
        await pool.query("ROLLBACK");
        throw e;
    }
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set");
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        await ensureMigrationsTable(pool);

        const files = listSqlFiles();

        for (const file of files) {
            const id = file; // we use filename as id (e.g. 001_init.sql)
            const already = await hasMigration(pool, id);

            if (already) {
                console.log(`SKIP ${id} (already applied)`);
                continue;
            }

            const fullPath = path.join(MIGRATIONS_DIR, file);
            const sql = fs.readFileSync(fullPath, "utf8");

            console.log(`APPLY ${id}`);
            await applyMigration(pool, id, sql);
            console.log(`DONE  ${id}`);
        }

        console.log("Migrations complete.");
    } finally {
        await pool.end();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

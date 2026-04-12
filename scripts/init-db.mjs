import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
const projectRoot = process.cwd();
loadEnvConfig(projectRoot);

const config = {
  dbUrl: process.env.TURSO_DATABASE_URL,
  dbToken: process.env.TURSO_AUTH_TOKEN,
};

if (!config.dbUrl) {
  console.error("TURSO_DATABASE_URL is not set. Init aborted.");
  process.exit(1);
}

const db = createClient({
  url: config.dbUrl,
  authToken: config.dbToken,
});

async function main() {
  console.log("[DB] Initializing database tables...");

  // Create games table
  console.log("[DB] Creating 'games' table...");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      cover TEXT,
      tags TEXT,
      download TEXT,
      download_label TEXT,
      views INTEGER DEFAULT 0,
      source_id TEXT,
      source_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("[DB] Creating indexes for 'games'...");
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_games_views ON games(views DESC)`);

  // Create guides table
  console.log("[DB] Creating 'guides' table...");
  await db.execute(`
    CREATE TABLE IF NOT EXISTS guides (
      slug TEXT PRIMARY KEY,
      markdown TEXT,
      provider TEXT,
      model TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slug) REFERENCES games(slug) ON DELETE CASCADE
    )
  `);

  console.log("[DB] Database initialization complete.");
}

main().catch((err) => {
  console.error("[DB] Initialization failed:", err);
  process.exit(1);
});

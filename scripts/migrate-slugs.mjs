import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ASCII-safe slugify: keep only a-z, 0-9, dash. Collapse consecutive dashes.
const toAsciiSlug = (raw) => {
  let s = raw
    .replace(/[^\x00-\x7F]+/g, "-")     // replace all non-ASCII with dash
    .replace(/[^a-zA-Z0-9\-]+/g, "-")   // replace any remaining non-alphanumeric with dash
    .replace(/-+/g, "-")                 // collapse consecutive dashes
    .replace(/^-|-$/g, "");              // trim leading/trailing dashes
  return s || "game";
};

async function main() {
  const games = await db.execute("SELECT slug FROM games ORDER BY slug");
  console.log(`[Migrate] Found ${games.rows.length} games to migrate.\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of games.rows) {
    const oldSlug = row.slug;
    const newSlug = toAsciiSlug(oldSlug);

    if (newSlug === oldSlug) {
      skipped++;
      continue;
    }

    // Make sure new slug is unique by appending part of old slug hash if collision
    let finalSlug = newSlug;
    let collision = await db.execute({
      sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1",
      args: [finalSlug],
    });
    let suffix = 1;
    while (collision.rows.length > 0 && finalSlug !== oldSlug) {
      finalSlug = `${newSlug}-${suffix}`;
      suffix++;
      collision = await db.execute({
        sql: "SELECT 1 FROM games WHERE slug = ? LIMIT 1",
        args: [finalSlug],
      });
    }

    try {
      await db.execute({
        sql: "UPDATE games SET slug = ? WHERE slug = ?",
        args: [finalSlug, oldSlug],
      });
      await db.execute({
        sql: "UPDATE guides SET slug = ? WHERE slug = ?",
        args: [finalSlug, oldSlug],
      });
      updated++;
      console.log(`[Migrate] "${oldSlug.slice(0, 60)}" → "${finalSlug}"`);
    } catch (err) {
      console.error(`[Migrate] FAILED "${oldSlug}": ${err.message}`);
    }
  }

  console.log(`\n[Migrate] Done. Updated: ${updated} | Skipped: ${skipped}`);
}

main().catch(console.error);

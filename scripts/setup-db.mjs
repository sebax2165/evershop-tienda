/**
 * Database setup script for EverShop on Railway.
 *
 * Usage: Set DATABASE_URL env var and run:
 *   DATABASE_URL="postgresql://..." node scripts/setup-db.mjs
 *
 * Requires: npm install pg bcryptjs
 */
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
  console.error('Usage: DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/setup-db.mjs');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  let bcrypt;
  try {
    bcrypt = await import('bcryptjs');
  } catch {
    console.error('Error: bcryptjs not installed. Run: npm install bcryptjs');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    console.log('Connected to Postgres');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "admin_user" (
        "admin_user_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
        "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
        "status" boolean NOT NULL DEFAULT TRUE,
        "email" varchar NOT NULL,
        "password" varchar NOT NULL,
        "full_name" varchar DEFAULT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ADMIN_USER_EMAIL_UNIQUE" UNIQUE ("email"),
        CONSTRAINT "ADMIN_USER_UUID_UNIQUE" UNIQUE ("uuid")
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "migration" (
        "migration_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
        "module" varchar NOT NULL,
        "version" varchar NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MODULE_UNIQUE" UNIQUE ("module")
      );
    `);

    const email = process.env.ADMIN_EMAIL || 'admin@evershop.io';
    const password = process.env.ADMIN_PASSWORD || 'Admin1234';
    const name = process.env.ADMIN_NAME || 'Admin';

    const salt = bcrypt.default.genSaltSync(10);
    const hash = bcrypt.default.hashSync(password, salt);

    await client.query(
      `INSERT INTO "admin_user" ("email", "password", "full_name", "status")
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT ("email") DO UPDATE SET "password" = $2, "full_name" = $3`,
      [email, hash, name]
    );

    console.log(`Admin user created: ${email}`);
    console.log('Setup complete!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();

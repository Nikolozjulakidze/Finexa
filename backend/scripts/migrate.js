import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";

// Create __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROP_ALL = `
    DROP TABLE IF EXISTS email_otps CASCADE;
    DROP TABLE IF EXISTS ai_insights CASCADE;
    DROP TABLE IF EXISTS bank_transactions CASCADE;
    DROP TABLE IF EXISTS bank_accounts CASCADE;
    DROP TABLE IF EXISTS bank_connections CASCADE;
    DROP TABLE IF EXISTS budgets CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS cards CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
`;

const runMigration = async () => {
  const shouldReset = process.argv.includes("--reset");
  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");

  try {
    if (shouldReset) {
      console.log("Dropping existing tables...");
      await pool.query(DROP_ALL);
    }

    console.log(`Reading schema from ${schemaPath}`);
    const schema = await fs.readFile(schemaPath, "utf-8");

    console.log("Running migration...");
    await pool.query(schema);
    await pool.query(
      "ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS type VARCHAR(10);",
    );
    // OAuth support: make password nullable, add provider + unique provider_id
    await pool.query(
      "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);",
    );
    await pool.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);",
    );
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS users_provider_id_key ON users(provider_id) WHERE provider_id IS NOT NULL;",
    );
    // Email OTP verification table
    await pool.query(
      `CREATE TABLE IF NOT EXISTS email_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
    );
    await pool.query(
      "CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);",
    );

    // Card linking: add provider + connection linkage columns
    await pool.query(
      "ALTER TABLE cards ADD COLUMN IF NOT EXISTS provider VARCHAR(50);",
    );
    await pool.query(
      "ALTER TABLE cards ADD COLUMN IF NOT EXISTS provider_card_id VARCHAR(255);",
    );
    await pool.query(
      "ALTER TABLE cards ADD COLUMN IF NOT EXISTS connection_id INT REFERENCES bank_connections(id) ON DELETE SET NULL;",
    );
    await pool.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS cards_user_provider_card_key ON cards (user_id, provider, provider_card_id) WHERE provider IS NOT NULL AND provider_card_id IS NOT NULL;",
    );

    console.log("Migration complete. Tables created.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();

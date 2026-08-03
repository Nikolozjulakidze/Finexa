import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";

// Create __filename and __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROP_ALL = `
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

    console.log("Migration complete. Tables created.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();

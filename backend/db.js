import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool, types } = pkg;

types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", () => {
  console.log("Connected to Postgres");
});

pool.on("error", (err) => {
  console.log("Unexpected Postgres error", err);
  process.exit(-1);
});

export default pool;

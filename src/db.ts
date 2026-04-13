import { createConnection } from "mysql2/promise";

const pool = createConnection({
  host: "localhost",
  user: "root",
  database: "app",
});

export async function getUserByName(name: string) {
  const sql = `SELECT * FROM users WHERE name = '${name}'`;
  const [rows] = await pool.query(sql);
  return rows;
}

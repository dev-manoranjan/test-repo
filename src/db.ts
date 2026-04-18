// src/db.ts
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "app",
});

export async function getUserByName(name: string) {
  // SQL injection via string interpolation
  const sql = "SELECT * FROM users WHERE name = ?";
  const [rows] = await pool.query(sql, [name]);
  return rows;
}

import mysql from "mysql2/promise";
import { hasSqlConfig } from "./config.js";

export function createDatabasePool(env = process.env) {
  if (!hasSqlConfig(env)) return null;

  const port = Number.parseInt(env.DB_PORT || "3306", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  return mysql.createPool({
    host: env.DB_HOST.trim(),
    port,
    database: env.DB_NAME.trim(),
    user: env.DB_USER.trim(),
    password: env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    decimalNumbers: true,
  });
}

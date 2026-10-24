const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

// Pool configuration using environment variables
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bloodbank_sql",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Create the connection pool
const pool = mysql.createPool(poolConfig);

/**
 * Execute a parameterized SQL query
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Parameters array
 * @returns {Promise<Array>} Query results
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Check database connectivity
 * @returns {Promise<{connected: boolean, message: string, timestamp?: string}>}
 */
async function testConnection() {
  try {
    const [rows] = await pool.query(
      "SELECT 1 AS check_result, NOW() AS server_time",
    );
    return {
      connected: true,
      message: "Database connection successful",
      serverTime: rows[0].server_time,
    };
  } catch (error) {
    return {
      connected: false,
      message: `Database connection failed: ${error.message}`,
    };
  }
}

/**
 * Acquire a connection from the pool (useful for transactions)
 * @returns {Promise<mysql.PoolConnection>}
 */
async function getConnection() {
  return await pool.getConnection();
}

module.exports = {
  pool,
  query,
  testConnection,
  getConnection,
};

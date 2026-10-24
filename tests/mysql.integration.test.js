import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import mysql from "mysql2/promise";
import request from "supertest";
import { createApp } from "../backend/app.js";

const testDatabase = process.env.MYSQL_TEST_DATABASE;

test(
  "MySQL integration search returns rows that match the seeded SQL schema",
  {
    skip:
      !testDatabase &&
      "Set MYSQL_TEST_DATABASE to opt into read-only MySQL integration checks.",
  },
  async () => {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number.parseInt(process.env.DB_PORT || "3306", 10),
      database: testDatabase,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      waitForConnections: true,
      connectionLimit: 2,
      decimalNumbers: true,
    });

    try {
      await pool.query("SELECT blood_group_id FROM blood_groups LIMIT 1");
      const app = createApp({ dbPool: pool });
      const response = await request(app)
        .get("/api/blood-banks")
        .query({ bloodGroup: "O+", city: "Pune" })
        .expect(200);

      assert.equal(response.body.count, response.body.data.length);
      for (const bank of response.body.data) {
        assert.equal(bank.bloodGroup, "O+");
        assert.equal(bank.city.toLowerCase(), "pune");
        assert.ok(bank.unitsAvailable > 0);
        assert.equal(typeof bank.bloodBankId, "string");
      }

      const reqResponse = await request(app)
        .get("/api/requests")
        .query({ status: "pending" })
        .expect(200);

      assert.ok(reqResponse.body.count >= 2);
      for (const req of reqResponse.body.data) {
        assert.equal(req.status, "pending");
        assert.ok(req.hospitalName);
        assert.ok(req.bloodGroup);
        assert.ok(req.unitsRequested > 0);
      }
    } finally {
      await pool.end();
    }
  },
);

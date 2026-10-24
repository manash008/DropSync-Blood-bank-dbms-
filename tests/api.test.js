import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../backend/app.js";

const demoRows = [
  {
    bloodBankId: 1,
    name: "Demo Central Blood Bank",
    address: "10 Sample Road",
    city: "Pune",
    phone: "+91-20-5550-0101",
    latitude: 18.5204,
    longitude: 73.8567,
    bloodGroup: "O+",
    unitsAvailable: 12,
  },
];

function fakePool({ rows = demoRows, error = null } = {}) {
  const calls = [];
  return {
    calls,
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      if (error) throw error;
      return [rows];
    },
    async query() {
      return [[{ ready: 1 }]];
    },
  };
}

test("valid blood-bank search uses SQL placeholders and returns API fields", async () => {
  const pool = fakePool();
  const app = createApp({
    dbPool: pool,
    frontendOrigin: "http://localhost:5000",
  });
  const response = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "o+", city: "Pune" })
    .expect(200);

  assert.equal(response.body.count, 1);
  assert.deepEqual(response.body.data[0], {
    bloodBankId: "1",
    name: "Demo Central Blood Bank",
    address: "10 Sample Road",
    city: "Pune",
    phone: "+91-20-5550-0101",
    latitude: 18.5204,
    longitude: 73.8567,
    bloodGroup: "O+",
    unitsAvailable: 12,
  });
  assert.match(pool.calls[0].sql, /bg\.group_code = \?/u);
  assert.match(pool.calls[0].sql, /bb\.city = \?/u);
  assert.deepEqual(pool.calls[0].parameters, ["O+", "Pune"]);
});

test("invalid or missing search fields return 400 without querying SQL", async () => {
  const pool = fakePool();
  const app = createApp({ dbPool: pool });

  const missing = await request(app).get("/api/blood-banks").expect(400);
  const unsupported = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "X+", city: "Pune" })
    .expect(400);

  assert.equal(missing.body.error.code, "INVALID_SEARCH");
  assert.ok(unsupported.body.error.fields.bloodGroup);
  assert.equal(pool.calls.length, 0);
});

test("a valid search with no matching stock returns an empty result list", async () => {
  const pool = fakePool({ rows: [] });
  const app = createApp({ dbPool: pool });
  const response = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "O+", city: "NoSuchCity" })
    .expect(200);

  assert.deepEqual(response.body, { data: [], count: 0 });
});

test("SQL-only setup reports a safe 503 when database configuration is missing", async () => {
  const app = createApp();
  const response = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "O+", city: "Pune" })
    .expect(503);

  assert.equal(response.body.error.code, "DATABASE_UNAVAILABLE");
  assert.equal(JSON.stringify(response.body).includes("password"), false);
});

test("database connection errors are sanitized for callers", async () => {
  const pool = fakePool({
    error: Object.assign(new Error("internal host and password"), {
      code: "ECONNREFUSED",
    }),
  });
  const app = createApp({ dbPool: pool });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await request(app)
      .get("/api/blood-banks")
      .query({ bloodGroup: "O+", city: "Pune" })
      .expect(503);
    assert.equal(response.body.error.code, "SEARCH_UNAVAILABLE");
    assert.equal(
      JSON.stringify(response.body).includes("internal host"),
      false,
    );
    assert.equal(JSON.stringify(response.body).includes("password"), false);
  } finally {
    console.error = originalError;
  }
});

test("Mongo logger failure does not fail SQL search", async () => {
  const pool = fakePool();
  const logger = {
    status: "unavailable",
    recordSearch: async () => {
      throw new Error("Mongo down");
    },
  };
  const app = createApp({ dbPool: pool, activityLogger: logger });
  const response = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "O+", city: "Pune" })
    .expect(200);

  await new Promise(setImmediate);
  assert.equal(response.body.count, 1);
});

test("health endpoint reports SQL readiness and Mongo logging status", async () => {
  const app = createApp({
    dbPool: fakePool(),
    activityLogger: { status: "disabled" },
  });
  const response = await request(app).get("/api/health").expect(200);

  assert.deepEqual(response.body, {
    status: "ok",
    database: "connected",
    activityLogging: "disabled",
  });
});

test("CORS rejects origins other than the configured frontend", async () => {
  const app = createApp({
    dbPool: fakePool(),
    frontendOrigin: "http://localhost:5000",
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://not-the-frontend.example")
      .expect(403);
    assert.equal(response.body.error.code, "ORIGIN_NOT_ALLOWED");
  } finally {
    console.error = originalError;
  }
});

test("the application serves the search page from its static frontend directory", async () => {
  const app = createApp();
  const response = await request(app).get("/").expect(200);
  assert.match(response.text, /Search Availability/u);
});

test("ALL searches accept optional location filters and return sorted distances", async () => {
  const pool = fakePool();
  const app = createApp({ dbPool: pool });
  const response = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "ALL", lat: "18.5204", lng: "73.8567" })
    .expect(200);

  assert.equal(response.body.data[0].bloodGroup, "O+");
  assert.equal(response.body.data[0].distanceKm, 0);
  assert.equal(response.body.count, 1);
  assert.deepEqual(pool.calls[0].parameters, []);
  assert.doesNotMatch(pool.calls[0].sql, /WHERE/u);
});

test("invalid or incomplete coordinates return 400 without querying SQL", async () => {
  const pool = fakePool();
  const app = createApp({ dbPool: pool });

  const incomplete = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "O+", lat: "18.5" })
    .expect(400);
  const outOfRange = await request(app)
    .get("/api/blood-banks")
    .query({ bloodGroup: "O+", lat: "91", lng: "73" })
    .expect(400);

  assert.ok(incomplete.body.error.fields.location);
  assert.ok(outOfRange.body.error.fields.lat);
  assert.equal(pool.calls.length, 0);
});

test("valid hospital requests query uses SQL placeholders and returns API fields", async () => {
  const requestRows = [
    {
      requestId: 1,
      hospitalId: 1,
      hospitalName: "Demo City Hospital",
      hospitalCity: "Pune",
      hospitalPhone: "+91-20-5550-0201",
      hospitalLatitude: 18.515,
      hospitalLongitude: 73.845,
      bloodGroup: "O+",
      unitsRequested: 4,
      urgency: "critical",
      status: "pending",
      fulfilledByBloodBank: null,
      requestedAt: "2026-10-20T08:15:00Z",
      fulfilledAt: null,
      notes: "Fictional classroom example",
    },
  ];
  const pool = fakePool({ rows: requestRows });
  const app = createApp({ dbPool: pool });
  const response = await request(app)
    .get("/api/requests")
    .query({ status: "pending", urgency: "critical", city: "Pune" })
    .expect(200);

  assert.equal(response.body.count, 1);
  assert.equal(response.body.data[0].requestId, "1");
  assert.equal(response.body.data[0].hospitalName, "Demo City Hospital");
  assert.equal(response.body.data[0].bloodGroup, "O+");
  assert.equal(response.body.data[0].unitsRequested, 4);
  assert.equal(response.body.data[0].urgency, "critical");
  assert.match(pool.calls[0].sql, /r\.status = \?/u);
  assert.match(pool.calls[0].sql, /r\.urgency = \?/u);
  assert.match(pool.calls[0].sql, /h\.city = \?/u);
  assert.deepEqual(pool.calls[0].parameters, ["pending", "critical", "Pune"]);
});

test("invalid requests query parameters return 400 without querying SQL", async () => {
  const pool = fakePool();
  const app = createApp({ dbPool: pool });

  const invalid = await request(app)
    .get("/api/requests")
    .query({ status: "invalid_status", urgency: "extreme" })
    .expect(400);

  assert.equal(invalid.body.error.code, "INVALID_REQUEST_QUERY");
  assert.ok(invalid.body.error.fields.status);
  assert.ok(invalid.body.error.fields.urgency);
  assert.equal(pool.calls.length, 0);
});

test("requests endpoint reports safe 503 when database configuration is missing", async () => {
  const app = createApp();
  const response = await request(app).get("/api/requests").expect(503);

  assert.equal(response.body.error.code, "DATABASE_UNAVAILABLE");
  assert.equal(JSON.stringify(response.body).includes("password"), false);
});

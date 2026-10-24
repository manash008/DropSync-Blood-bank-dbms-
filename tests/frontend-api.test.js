import assert from "node:assert/strict";
import { test } from "node:test";
import { searchBloodAvailability, setActiveMode } from "../frontend/js/api.js";

test("frontend sends the documented API query and normalizes live SQL fields", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    setActiveMode("live");
  });

  setActiveMode("live");
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        count: 1,
        data: [
          {
            bloodBankId: "12",
            name: "Example Blood Bank",
            address: "1 Example Road",
            city: "Pune",
            phone: "+91-20-5550-0101",
            latitude: 18.5204,
            longitude: 73.8567,
            bloodGroup: "O+",
            unitsAvailable: 5,
            distanceKm: 0,
          },
        ],
      }),
    };
  };

  const result = await searchBloodAvailability({
    bloodGroup: "O+",
    city: "Pune",
    userLat: 18.5204,
    userLng: 73.8567,
  });

  assert.equal(requestedUrl.pathname, "/api/blood-banks");
  assert.equal(requestedUrl.searchParams.get("bloodGroup"), "O+");
  assert.equal(requestedUrl.searchParams.get("city"), "Pune");
  assert.equal(requestedUrl.searchParams.get("lat"), "18.5204");
  assert.equal(requestedUrl.searchParams.get("lng"), "73.8567");
  assert.equal(result.source, "live");
  assert.equal(result.results[0].blood_bank_id, "12");
  assert.equal(result.results[0].units_available, 5);
  assert.equal(result.results[0].distance_km, 0);
});

test("frontend exposes backend errors instead of silently showing sample inventory", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    setActiveMode("live");
  });

  setActiveMode("live");
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({
      error: {
        code: "SEARCH_UNAVAILABLE",
        message: "Blood-bank search is temporarily unavailable.",
      },
    }),
  });

  await assert.rejects(
    searchBloodAvailability({ bloodGroup: "O+", city: "Pune" }),
    /temporarily unavailable/u,
  );
});
test("ALL-mode SQL rows combine into one bank card without inventing missing groups", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
    setActiveMode("live");
  });

  setActiveMode("live");
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      count: 1,
      data: [
        {
          bloodBankId: "12",
          name: "Example Blood Bank",
          address: "1 Example Road",
          city: "Pune",
          phone: "+91-20-5550-0101",
          latitude: 18.5204,
          longitude: 73.8567,
          bloodGroup: "O+",
          unitsAvailable: 5,
        },
        {
          bloodBankId: "12",
          name: "Example Blood Bank",
          address: "1 Example Road",
          city: "Pune",
          phone: "+91-20-5550-0101",
          latitude: 18.5204,
          longitude: 73.8567,
          bloodGroup: "A+",
          unitsAvailable: 2,
        },
      ],
    }),
  });

  const result = await searchBloodAvailability({
    bloodGroup: "ALL",
    city: "Pune",
  });

  assert.equal(result.count, 1);
  assert.equal(result.results[0].units_available, 7);
  assert.deepEqual(result.results[0].full_inventory, { "O+": 5, "A+": 2 });
  assert.equal(result.results[0].inventory_complete, false);
});

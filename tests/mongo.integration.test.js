import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { MongoClient } from "mongodb";
import { connectActivityLogger } from "../backend/activity-logger.js";

const mongoUri = process.env.MONGO_TEST_URI;

test(
  "MongoDB activity logger writes searchable events when a test URI is configured",
  {
    skip: !mongoUri && "Set MONGO_TEST_URI to run MongoDB integration checks.",
  },
  async () => {
    const logger = await connectActivityLogger(mongoUri);
    assert.equal(logger.status, "connected");

    const client = new MongoClient(mongoUri);
    await client.connect();
    const collection = client.db().collection("activity_logs");
    const city = "Testville-" + randomUUID();

    try {
      await logger.recordSearch({
        bloodGroup: "O+",
        city,
        resultCount: 2,
      });
      const inserted = await collection.findOne({
        eventType: "blood_search",
        bloodGroup: "O+",
        city,
      });

      assert.ok(inserted);
      assert.equal(inserted.resultCount, 2);
      assert.ok(inserted.occurredAt instanceof Date);

      const aggregate = await collection
        .aggregate([
          { $match: { _id: inserted._id } },
          {
            $group: {
              _id: { bloodGroup: "$bloodGroup", city: "$city" },
              searchCount: { $sum: 1 },
              matchingBanksReturned: { $sum: "$resultCount" },
            },
          },
        ])
        .toArray();
      assert.deepEqual(aggregate[0], {
        _id: { bloodGroup: "O+", city },
        searchCount: 1,
        matchingBanksReturned: 2,
      });
    } finally {
      await collection.deleteMany({ eventType: "blood_search", city });
      await Promise.allSettled([client.close(), logger.close()]);
    }
  },
);

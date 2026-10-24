import { MongoClient } from "mongodb";
import "dotenv/config";

const mongoUri =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bloodbank_nosql";

async function runAggregation() {
  const client = new MongoClient(mongoUri, {
    connectTimeoutMS: 2000,
    serverSelectionTimeoutMS: 2000,
  });

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection("activity_logs");

    const pipeline = [
      { $match: { eventType: "blood_search" } },
      {
        $group: {
          _id: { bloodGroup: "$bloodGroup", city: "$city" },
          searchCount: { $sum: 1 },
          matchingBanksReturned: { $sum: "$resultCount" },
        },
      },
      { $sort: { "_id.bloodGroup": 1, "_id.city": 1 } },
    ];

    const results = await collection.aggregate(pipeline).toArray();
    console.log(
      `MongoDB Activity Log Aggregation Report (${results.length} group${results.length === 1 ? "" : "s"}):`,
    );
    for (const doc of results) {
      console.log(JSON.stringify(doc, null, 2));
    }
  } catch (err) {
    console.error("MongoDB aggregation failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

runAggregation();

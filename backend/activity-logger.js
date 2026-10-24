import { MongoClient } from "mongodb";

function noOpLogger(status) {
  return {
    status,
    recordSearch: async () => {},
    close: async () => {},
  };
}

export async function connectActivityLogger(
  mongoUri,
  { logger = console } = {},
) {
  if (!mongoUri) return noOpLogger("disabled");

  const client = new MongoClient(mongoUri, {
    connectTimeoutMS: 1500,
    serverSelectionTimeoutMS: 1500,
  });

  try {
    await client.connect();
    const collection = client.db().collection("activity_logs");
    await collection.createIndex({ eventType: 1, occurredAt: -1 });
    await collection.createIndex({ eventType: 1, bloodGroup: 1, city: 1 });

    return {
      status: "connected",
      recordSearch: async ({ bloodGroup, city, resultCount }) => {
        await collection.insertOne({
          eventType: "blood_search",
          bloodGroup,
          city,
          resultCount,
          occurredAt: new Date(),
        });
      },
      close: async () => client.close(),
    };
  } catch (error) {
    await client.close().catch(() => {});
    logger.warn?.(
      "MongoDB activity logging is unavailable (" +
        (error.code || "connection error") +
        ").",
    );
    return noOpLogger("unavailable");
  }
}

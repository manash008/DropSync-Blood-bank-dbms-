import "dotenv/config";
import { createApp } from "./app.js";
import { connectActivityLogger } from "./activity-logger.js";
import { getConfig } from "./config.js";
import { createDatabasePool } from "./database.js";

const config = getConfig();
const dbPool = createDatabasePool();
const activityLogger = await connectActivityLogger(config.mongoUri);
const app = createApp({
  dbPool,
  activityLogger,
  frontendOrigin: config.frontendOrigin,
});
const server = app.listen(config.port, () => {
  console.log("DropSync is available at http://localhost:" + config.port);
  if (!dbPool)
    console.warn(
      "SQL search is unavailable: set DB_HOST, DB_NAME, and DB_USER.",
    );
  if (activityLogger.status !== "connected") {
    console.log("MongoDB activity logging: " + activityLogger.status + ".");
  }
});

async function shutdown() {
  server.close(async () => {
    await Promise.allSettled([dbPool?.end(), activityLogger.close()]);
    process.exit(0);
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

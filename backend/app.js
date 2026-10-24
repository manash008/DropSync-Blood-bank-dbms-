import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { searchBloodBanks, validateSearchQuery } from "./search.js";

const frontendDirectory = fileURLToPath(
  new URL("../frontend/", import.meta.url),
);

export function createApp({
  dbPool = null,
  activityLogger = { status: "disabled" },
  frontendOrigin = "http://localhost:5000",
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === frontendOrigin) {
          callback(null, true);
          return;
        }
        callback(
          Object.assign(new Error("Origin is not allowed."), { status: 403 }),
        );
      },
      methods: ["GET", "OPTIONS"],
      allowedHeaders: ["Content-Type"],
    }),
  );
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", async (_request, response) => {
    if (!dbPool) {
      response.status(503).json({
        status: "degraded",
        database: "not_configured",
        activityLogging: activityLogger.status,
      });
      return;
    }

    try {
      await dbPool.query("SELECT 1");
      response.json({
        status: "ok",
        database: "connected",
        activityLogging: activityLogger.status,
      });
    } catch {
      response.status(503).json({
        status: "degraded",
        database: "unavailable",
        activityLogging: activityLogger.status,
      });
    }
  });

  app.get("/api/blood-banks", async (request, response) => {
    const { errors, values } = validateSearchQuery(request.query);
    if (Object.keys(errors).length > 0) {
      response.status(400).json({
        error: {
          code: "INVALID_SEARCH",
          message:
            "Provide a supported blood group and valid city or location filters.",
          fields: errors,
        },
      });
      return;
    }

    if (!dbPool) {
      response.status(503).json({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Blood-bank search is temporarily unavailable.",
        },
      });
      return;
    }

    try {
      const data = await searchBloodBanks(dbPool, values);
      const count = new Set(data.map((result) => result.bloodBankId)).size;
      Promise.resolve()
        .then(() =>
          activityLogger.recordSearch?.({
            bloodGroup: values.bloodGroup,
            city: values.city,
            resultCount: count,
          }),
        )
        .catch(() => {});

      response.json({ data, count });
    } catch (error) {
      console.error(
        "Blood-bank search failed (" + (error.code || "database error") + ").",
      );
      response.status(503).json({
        error: {
          code: "SEARCH_UNAVAILABLE",
          message: "Blood-bank search is temporarily unavailable.",
        },
      });
    }
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({
      error: { code: "NOT_FOUND", message: "API route not found." },
    });
  });

  app.use(express.static(frontendDirectory));

  app.use((error, _request, response, _next) => {
    const status = error.status === 403 ? 403 : 500;
    response.status(status).json({
      error: {
        code: status === 403 ? "ORIGIN_NOT_ALLOWED" : "INTERNAL_ERROR",
        message:
          status === 403
            ? "This frontend origin is not allowed."
            : "An unexpected server error occurred.",
      },
    });
  });

  return app;
}

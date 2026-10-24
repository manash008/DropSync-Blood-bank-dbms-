export function getConfig(env = process.env) {
  const port = Number.parseInt(env.PORT || "5000", 10);
  const frontendUrl = (env.FRONTEND_URL || "http://localhost:" + port).trim();

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  let frontendOrigin;
  try {
    frontendOrigin = new URL(frontendUrl).origin;
  } catch {
    throw new Error("FRONTEND_URL must be a valid absolute URL.");
  }

  return {
    port,
    frontendOrigin,
    mongoUri: (env.MONGO_URI || "").trim(),
  };
}

export function hasSqlConfig(env = process.env) {
  return Boolean(
    (env.DB_HOST || "").trim() &&
    (env.DB_NAME || "").trim() &&
    (env.DB_USER || "").trim(),
  );
}

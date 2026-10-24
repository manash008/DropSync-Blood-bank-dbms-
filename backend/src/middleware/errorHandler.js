/**
 * Not Found (404) Middleware
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * Global Error Handler Middleware
 */
function globalErrorHandler(err, req, res, _next) {
  console.error(`[Error] ${err.message}`, err.stack);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred",
      ...(process.env.NODE_ENV === "development" && { details: err.stack }),
    },
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler,
};

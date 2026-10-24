const db = require('../config/db');

/**
 * Health check endpoint: checks server and database readiness
 */
async function getHealth(req, res) {
  const dbStatus = await db.testConnection();

  const healthData = {
    status: dbStatus.connected ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      api: {
        status: 'up'
      },
      database: {
        engine: 'MySQL (8.0.19+ InnoDB)',
        status: dbStatus.connected ? 'connected' : 'disconnected',
        details: dbStatus.message,
        ...(dbStatus.serverTime && { serverTime: dbStatus.serverTime })
      }
    }
  };

  const httpStatus = dbStatus.connected ? 200 : 503;
  return res.status(httpStatus).json(healthData);
}

module.exports = {
  getHealth
};

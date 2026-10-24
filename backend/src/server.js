const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middlewares
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// API Routes
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/requests', require('./routes/requestsRoutes'));
app.use('/api', require('./routes/metaRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'DropSync Blood Bank Management API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      inventory: '/api/inventory',
      inventory_summary: '/api/inventory/summary',
      requests: '/api/requests',
      blood_groups: '/api/blood-groups',
      blood_banks: '/api/blood-banks',
      hospitals: '/api/hospitals',
      donors: '/api/donors'
    },
    documentation: 'See backend/README.md for API documentation and examples'
  });
});

// 404 and Error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 DropSync Backend running on port ${PORT}`);
    console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Inventory:    http://localhost:${PORT}/api/inventory`);
    console.log(`📋 Requests:     http://localhost:${PORT}/api/requests`);
    console.log(`===============================================`);
  });
}

module.exports = app;

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// GET /api/inventory - Search blood inventory with filters (blood_group, city, min_units)
router.get('/', inventoryController.searchInventory);

// GET /api/inventory/summary - Aggregated total units per blood group and city
router.get('/summary', inventoryController.getInventorySummary);

module.exports = router;

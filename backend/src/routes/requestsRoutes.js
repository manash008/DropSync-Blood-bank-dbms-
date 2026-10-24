const express = require("express");
const router = express.Router();
const requestsController = require("../controllers/requestsController");

// GET /api/requests - List blood requests sorted by urgency and date
router.get("/", requestsController.getRequests);

// GET /api/requests/:id - Get specific request details
router.get("/:id", requestsController.getRequestById);

// POST /api/requests - Hospital raises a new blood request
router.post("/", requestsController.createRequest);

module.exports = router;

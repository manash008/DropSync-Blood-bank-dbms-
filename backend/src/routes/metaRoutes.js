const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

// Blood groups list
router.get('/blood-groups', metaController.getBloodGroups);

// Blood banks list
router.get('/blood-banks', metaController.getBloodBanks);

// Hospitals list
router.get('/hospitals', metaController.getHospitals);

// Donors list / search
router.get('/donors', metaController.getDonors);

// Record a donation with atomic inventory transaction
router.post('/donations', metaController.recordDonation);

module.exports = router;

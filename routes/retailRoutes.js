const express = require('express');
const router = express.Router();
const retailFraudController = require('../controllers/retailFraudController');

router.get('/topology', retailFraudController.getRetailTopology);
router.post('/ingest', retailFraudController.ingestRetailData);

module.exports = router;

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureLenderAuth } = require('../middleware/lenderAuth');

router.use(ensureLenderAuth);

router.get('/alerts', dashboardController.getAlerts);
router.get('/lender/:id/portfolio', dashboardController.getPortfolio);
router.get('/kpi', dashboardController.getKPI);
router.get('/discrepancies', dashboardController.getDiscrepancies);
router.get('/velocity', dashboardController.getVelocity);

module.exports = router;

const express = require('express');
const router = express.Router();
const identityController = require('../controllers/identityController');
const { ensureLenderAuth } = require('../middleware/lenderAuth');

router.use(ensureLenderAuth);

router.post('/onboard', identityController.onboardSupplier);
router.post('/revoke/:companyId', identityController.revokeCredential);
router.get('/companies', identityController.getCompanies);
router.get('/companies/:id/profile', identityController.getCompanyProfile);
router.post('/companies', identityController.createCompany);
router.get('/pos', identityController.getPOs);
router.get('/grns', identityController.getGRNs);

module.exports = router;

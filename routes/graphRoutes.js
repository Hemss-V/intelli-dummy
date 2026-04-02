const express = require('express');
const router = express.Router();
const graphEngineService = require('../services/graphEngineService');
const { ensureLenderAuth } = require('../middleware/lenderAuth');

router.use(ensureLenderAuth);

router.get('/topology', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const topology = await graphEngineService.getTopology(lenderId);
        res.json(topology);
    } catch (error) {
        console.error('Error fetching topology:', error);
        res.status(500).json({ error: 'Failed to fetch graph topology' });
    }
});

router.get('/ego/:entityId', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const { entityId } = req.params;
        const egoNetwork = await graphEngineService.getEgoNetwork(lenderId, entityId);
        res.json(egoNetwork);
    } catch (error) {
        console.error('Error fetching ego network:', error);
        res.status(500).json({ error: 'Failed to fetch ego network' });
    }
});

router.get('/cycles', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const cycles = await graphEngineService.detectCycles(lenderId);
        res.json(cycles);
    } catch (error) {
        console.error('Error detecting cycles:', error);
        res.status(500).json({ error: 'Failed to detect carousel trades' });
    }
});

router.get('/cascade/:rootPoId', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const { rootPoId } = req.params;
        const cascade = await graphEngineService.getCascadeExposureDetails(lenderId, rootPoId);
        res.json(cascade);
    } catch (error) {
        console.error('Error calculating cascade exposure:', error);
        res.status(500).json({ error: 'Failed to calculate cascade exposure' });
    }
});

router.get('/contagion/:entityId', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const { entityId } = req.params;
        const contagion = await graphEngineService.getContagionImpact(lenderId, entityId);
        res.json(contagion);
    } catch (error) {
        console.error('Error calculating contagion impact:', error);
        res.status(500).json({ error: 'Failed to calculate contagion impact' });
    }
});

router.get('/centrality', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const centrality = await graphEngineService.calculateCentrality(lenderId);
        res.json(centrality);
    } catch (error) {
        console.error('Error fetching centrality:', error);
        res.status(500).json({ error: 'Failed to fetch centrality' });
    }
});

router.get('/isolated', async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const isolated = await graphEngineService.detectIsolatedNodes(lenderId);
        res.json(isolated);
    } catch (error) {
        console.error('Error fetching isolated nodes:', error);
        res.status(500).json({ error: 'Failed to fetch isolated nodes' });
    }
});

module.exports = router;

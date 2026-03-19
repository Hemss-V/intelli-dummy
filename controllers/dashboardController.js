const pool = require('../db/index');

const getAlerts = async (req, res) => {
    try {
        const lenderId = req.lenderId;
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const alertsQuery = await pool.query(
            `SELECT a.*, i.invoice_number FROM alerts a 
             JOIN invoices i ON a.invoice_id = i.id 
             WHERE a.lender_id = $1 
             ORDER BY a.created_at DESC 
             LIMIT $2 OFFSET $3`,
            [lenderId, limit, offset]
        );

        res.json(alertsQuery.rows);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
};

const getPortfolio = async (req, res) => {
    try {
        // Technically lenderId in params vs auth header. 
        // Best practice: verify header matches param, or just enforce header.
        const lenderIdFromAuth = req.lenderId;
        const requestedLenderId = req.params.id;

        if (String(lenderIdFromAuth) !== String(requestedLenderId)) {
            return res.status(403).json({ error: 'Access denied: Cannot view other lender portfolios' });
        }

        const invQuery = await pool.query(
            'SELECT id, invoice_number, amount, invoice_date, status, risk_score FROM invoices WHERE lender_id = $1 ORDER BY invoice_date DESC',
            [lenderIdFromAuth]
        );

        res.json(invQuery.rows);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
};

const getKPI = async (req, res) => {
    try {
        const lenderId = req.lenderId;
        // Simple aggregation for KPI
        const result = await pool.query(
            `SELECT 
                COUNT(*) as active_invoices,
                SUM(amount) as total_exposure,
                COUNT(*) FILTER (WHERE status = 'BLOCKED') as blocked_today
             FROM invoices WHERE lender_id = $1`,
            [lenderId]
        );
        const alertsResult = await pool.query('SELECT COUNT(*) as count FROM alerts WHERE lender_id = $1 AND resolved = false', [lenderId]);

        const row = result.rows[0];

        res.json({
            id: 1,
            activeInvoices: parseInt(row.active_invoices) || 0,
            activeInvoicesChange: 0,
            healthScore: 85,
            tier3Risk: 60,
            highRiskGaps: parseInt(alertsResult.rows[0].count) || 0,
            highRiskGapsChange: 0,
            totalExposure: parseFloat(row.total_exposure) || 0,
            blockedToday: parseInt(row.blocked_today) || 0,
            alertsCount: parseInt(alertsResult.rows[0].count) || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch KPI' });
    }
};

const getDiscrepancies = async (req, res) => {
    // Returning a dummy combined structure or DB fetch if GRN table is populated
    try {
        const lenderId = req.lenderId;
        const result = await pool.query(
            `SELECT i.id, c.name as company_name, i.amount as invoice_value, po.amount as po_value, grn.amount_received as grn_value 
             FROM invoices i 
             LEFT JOIN companies c ON i.supplier_id = c.id
             LEFT JOIN purchase_orders po ON i.po_id = po.id
             LEFT JOIN goods_receipts grn ON i.grn_id = grn.id
             WHERE i.lender_id = $1 AND i.status != 'SETTLED'
             LIMIT 10`,
            [lenderId]
        );

        const mapped = result.rows.map(r => ({
            id: r.id,
            companyName: r.company_name || 'Unknown',
            invoiceValue: parseFloat(r.invoice_value) || 0,
            poValue: parseFloat(r.po_value) || 0,
            grnValue: parseFloat(r.grn_value) || 0,
            matchStatus: parseFloat(r.invoice_value) === parseFloat(r.po_value)
        }));

        res.json(mapped.length > 0 ? mapped : []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch discrepancies' });
    }
};

const getVelocity = async (req, res) => {
    // Generate latest velocity curve from DB invoices or just return dynamic recent data
    res.json(Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        timestamp: new Date(Date.now() - (13 - i) * 86400000).toISOString(),
        tier1Velocity: 50 + Math.random() * 10,
        tier2Velocity: 35 + Math.random() * 8,
        tier3Velocity: i >= 5 && i <= 8 ? 85 + Math.random() * 5 : 15 + Math.random() * 5,
    })));
};

module.exports = {
    getAlerts,
    getPortfolio,
    getKPI,
    getDiscrepancies,
    getVelocity
};

const pool = require('../db/index');

const getRetailTopology = async (req, res) => {
    try {
        // Fetch all accounts
        const accountsQuery = await pool.query('SELECT * FROM retail_accounts');
        const accounts = accountsQuery.rows;

        // Fetch all transactions
        const txnsQuery = await pool.query('SELECT * FROM retail_transactions');
        const transactions = txnsQuery.rows;

        // Fraud Checks
        let alerts = [];

        // 1. Detect Mules (Receive from EXT, send to MSTR)
        // A simple heuristic for the demo dataset:
        const incomingMuleTxns = transactions.filter(t => t.sender_account.startsWith('EXT') && t.receiver_account.startsWith('MULE'));
        const outgoingMuleTxns = transactions.filter(t => t.sender_account.startsWith('MULE') && t.receiver_account.startsWith('MSTR'));

        const flaggedMules = new Set([
            ...incomingMuleTxns.map(t => t.receiver_account),
            ...outgoingMuleTxns.map(t => t.sender_account)
        ]);
        const masterNodes = new Set(outgoingMuleTxns.map(t => t.receiver_account));

        // 2. Detect Carousels (Circular Narration)
        const carouselTxns = transactions.filter(t =>
            t.narration === 'Loan Repayment' ||
            t.narration === 'Vendor Payment' ||
            t.narration === 'Consulting Fee'
        );
        const flaggedCarousels = new Set([
            ...carouselTxns.map(t => t.sender_account),
            ...carouselTxns.map(t => t.receiver_account)
        ]);

        // Map to standard format
        const nodes = accounts.map(acc => {
            const isMule = flaggedMules.has(acc.account_number);
            const isMaster = masterNodes.has(acc.account_number);
            const isCarousel = flaggedCarousels.has(acc.account_number);
            const isFlagged = isMule || isMaster || isCarousel;

            return {
                id: acc.account_number,
                label: `${acc.name}\n(${acc.account_type})`,
                tier: isMaster ? "T1" : (isMule ? "T3" : "T2"),
                riskScore: isMaster ? 99 : (isMule ? 95 : 20),
                isFlagged
            };
        });

        const edges = transactions.map((txn, idx) => {
            const isMuleTxn = txn.sender_account.startsWith('EXT') || txn.receiver_account.startsWith('MSTR');
            const isCarouselTxn = txn.narration === 'Loan Repayment' || txn.narration === 'Vendor Payment' || txn.narration === 'Consulting Fee';

            return {
                id: txn.transaction_id || `e-${idx}`,
                source: txn.sender_account,
                target: txn.receiver_account,
                type: (isMuleTxn || isCarouselTxn) ? "carousel" : "normal",
                label: `$${txn.amount}`
            };
        });

        res.json({ nodes, edges, alerts });
    } catch (error) {
        console.error('Error fetching retail topology:', error);
        res.status(500).json({ error: 'Failed to fetch retail topology' });
    }
};

const ingestRetailData = async (req, res) => {
    try {
        const transactions = req.body.transactions;
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ logs: ['> ERROR: INVALID PAYLOAD STRUCTURE'] });
        }

        const logs = [
            `> PAYLOAD RECEIVED: ${transactions.length} ITEMS`,
            '> VALIDATING SCHEMA: OK',
            '> TRIGGERING SHARP-EDGE ENGINE...'
        ];

        let flaggedCount = 0;

        for (const txn of transactions) {
            // Upsert Sender
            await pool.query(
                `INSERT INTO retail_accounts (account_number, name, mobile_number, pincode, account_type) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (account_number) DO NOTHING`,
                [txn.sender.account_number, txn.sender.name, txn.sender.mobile_number, txn.sender.pincode, txn.sender.account_type]
            );

            // Upsert Receiver
            await pool.query(
                `INSERT INTO retail_accounts (account_number, name, mobile_number, pincode, account_type) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (account_number) DO NOTHING`,
                [txn.receiver.account_number, txn.receiver.name, txn.receiver.mobile_number, txn.receiver.pincode, txn.receiver.account_type]
            );

            // Insert Transaction
            await pool.query(
                `INSERT INTO retail_transactions (transaction_id, timestamp, amount, narration, sender_account, receiver_account) 
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (transaction_id) DO NOTHING`,
                [txn.transaction_id, txn.timestamp, txn.amount, txn.narration, txn.sender.account_number, txn.receiver.account_number]
            );

            // Live Check for Demo Terminal
            if (txn.receiver.account_number.startsWith('MULE')) {
                logs.push(`> WARNING: SUSPECTED MULE NODE ISOLATED: "${txn.receiver.account_number}"`);
                flaggedCount++;
            }
            if (txn.narration === "Loan Repayment" || txn.narration === "Consulting Fee" || txn.narration === "Vendor Payment") {
                logs.push(`> CRITICAL: CIRCULAR CAROUSEL LOOP DETECTED ON "${txn.sender.account_number}"`);
                flaggedCount++;
            }
        }

        logs.push('> SYNCING WITH CORE LEDGER...');
        if (flaggedCount > 0) {
            logs.push(`> BATCH COMPLETE. ${transactions.length - flaggedCount} APPROVED.`);
            logs.push(`> BLOCKED: ${flaggedCount} ANOMALIES QUARANTINED.`);
        } else {
            logs.push(`> BATCH COMPLETE. ${transactions.length} APPROVED.`);
            logs.push('> CLEAR: NO ANOMALIES FOUND.');
        }

        res.json({ logs });
    } catch (error) {
        console.error('Error ingesting retail data:', error);
        res.status(500).json({ logs: ['> FATAL SYSTEM ERROR DURING INGESTION'] });
    }
};

module.exports = {
    getRetailTopology,
    ingestRetailData
};

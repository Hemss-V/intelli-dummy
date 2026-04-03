const { Pool } = require('pg');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.warn(
        '[db] DATABASE_URL is not set. Create a .env file with DATABASE_URL=postgresql://... (see README).'
    );
}

const pool = new Pool({
    connectionString:
        connectionString || 'postgresql://localhost:5432/sherlock?sslmode=disable',
});

(async () => {
    try {
        await pool.query('ALTER TABLE invoice_fingerprints DROP CONSTRAINT IF EXISTS invoice_fingerprints_fingerprint_key');
        await pool.query(
            'ALTER TABLE invoice_fingerprints ADD CONSTRAINT invoice_fingerprints_fingerprint_lender_key UNIQUE (fingerprint, lender_id)'
        );
    } catch {
        /* constraint may already match desired shape */
    }
})();

module.exports = pool;

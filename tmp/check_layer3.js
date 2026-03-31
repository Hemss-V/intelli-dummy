const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EG7XaOHL6FSZ@ep-snowy-violet-a15qdjeb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

async function checkImplementation() {
    try {
        console.log("--- LAYER 3 IMPLEMENTATION CHECK ---");
        
        // 1. Check schemas
        const tablesQuery = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('risk_score_audits', 'explanations', 'alerts', 'invoices');
        `);
        console.log("Existing tables:", tablesQuery.rows.map(r => r.table_name));

        const columnsQuery = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('risk_score_audits', 'invoices')
            ORDER BY table_name;
        `);
        console.log("\nTable Columns:");
        columnsQuery.rows.forEach(r => console.log(`${r.table_name}.${r.column_name}: ${r.data_type}`));

        // 2. Check risk_score_audits sample
        const auditSample = await pool.query('SELECT * FROM risk_score_audits LIMIT 1');
        console.log("\nRisk Score Audit Sample:", auditSample.rows[0] ? "EXISTS" : "NONE FOUND");
        if (auditSample.rows[0]) {
            console.log("Sample Audit:", JSON.stringify(auditSample.rows[0], null, 2));
        }

        // 3. Check triggers
        const triggerQuery = await pool.query(`
            SELECT event_object_table, trigger_name, event_manipulation, action_statement 
            FROM information_schema.triggers;
        `);
        console.log("\nDatabase Triggers:", triggerQuery.rows.length > 0 ? triggerQuery.rows : "NONE FOUND");

    } catch (err) {
        console.error("Diagnostic failed:", err);
    } finally {
        pool.end();
    }
}

checkImplementation();

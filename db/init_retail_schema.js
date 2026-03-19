const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EG7XaOHL6FSZ@ep-snowy-violet-a15qdjeb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

const executeSchema = async () => {
    const ddl = `
    DROP TABLE IF EXISTS retail_alerts, retail_transactions, retail_accounts CASCADE;

    CREATE TABLE IF NOT EXISTS retail_accounts (
      account_number VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      mobile_number VARCHAR(255),
      pincode VARCHAR(20),
      account_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS retail_transactions (
      transaction_id VARCHAR(255) PRIMARY KEY,
      timestamp TIMESTAMP,
      amount NUMERIC(15,2),
      narration TEXT,
      sender_account VARCHAR(255) REFERENCES retail_accounts(account_number),
      receiver_account VARCHAR(255) REFERENCES retail_accounts(account_number),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS retail_alerts (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(255) REFERENCES retail_transactions(transaction_id),
      account_number VARCHAR(255) REFERENCES retail_accounts(account_number),
      fraud_type VARCHAR(50), -- MULE_NETWORK, CAROUSEL_LOOP
      risk_score INTEGER,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

    try {
        await pool.query(ddl);
        console.log("Retail Database Schema Initialized Successfully!");
    } catch (error) {
        console.error("Error creating retail tables:", error);
    } finally {
        await pool.end();
    }
};

executeSchema();

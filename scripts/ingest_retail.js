const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_EG7XaOHL6FSZ@ep-snowy-violet-a15qdjeb-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

const ingestRetailData = async () => {
    try {
        const dataPath = path.join(__dirname, '../db/retail_transactions.json');
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const transactions = JSON.parse(fileContent);

        console.log(`Parsed ${transactions.length} retail transactions. Starting ingestion...`);

        for (const txn of transactions) {
            // 1. Upsert Sender
            await pool.query(
                `INSERT INTO retail_accounts (account_number, name, mobile_number, pincode, account_type) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (account_number) DO NOTHING`,
                [txn.sender.account_number, txn.sender.name, txn.sender.mobile_number, txn.sender.pincode, txn.sender.account_type]
            );

            // 2. Upsert Receiver
            await pool.query(
                `INSERT INTO retail_accounts (account_number, name, mobile_number, pincode, account_type) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (account_number) DO NOTHING`,
                [txn.receiver.account_number, txn.receiver.name, txn.receiver.mobile_number, txn.receiver.pincode, txn.receiver.account_type]
            );

            // 3. Insert Transaction
            await pool.query(
                `INSERT INTO retail_transactions (transaction_id, timestamp, amount, narration, sender_account, receiver_account) 
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (transaction_id) DO NOTHING`,
                [txn.transaction_id, txn.timestamp, txn.amount, txn.narration, txn.sender.account_number, txn.receiver.account_number]
            );
        }

        console.log("Ingestion Complete: All accounts and transactions have been saved to the database.");
    } catch (error) {
        console.error("Error ingesting retail data:", error);
    } finally {
        await pool.end();
    }
};

ingestRetailData();

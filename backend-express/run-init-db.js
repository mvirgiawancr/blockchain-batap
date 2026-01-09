const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function initDB() {
    const config = {
        user: process.env.DB_USER || 'virgi',
        host: process.env.DB_HOST || 'localhost',
        // Default database to connect to initially
        database: 'postgres', 
        password: process.env.DB_PASSWORD || 'virgi123',
        port: process.env.DB_PORT || 5432,
    };

    const targetDB = process.env.DB_NAME || 'lamtek';
    console.log(`Connecting to PostgreSQL at ${config.host}:${config.port}...`);
    
    // 1. Connect to default 'postgres' db to check/create target db
    let client = new Client(config);
    try {
        await client.connect();
        
        // Check if DB exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDB]);
        if (res.rowCount === 0) {
            console.log(`Database '${targetDB}' does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${targetDB}"`);
            console.log(`Database '${targetDB}' created.`);
        } else {
            console.log(`Database '${targetDB}' already exists.`);
        }
    } catch (err) {
        console.error('Error connecting to postgres database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Connect to the target DB to run the SQL script
    console.log(`Connecting to database '${targetDB}'...`);
    const dbConfig = { ...config, database: targetDB };
    client = new Client(dbConfig);

    try {
        await client.connect();
        
        const sqlPath = path.join(__dirname, 'init-db.sql');
        console.log(`Reading SQL file from ${sqlPath}...`);
        
        if (!fs.existsSync(sqlPath)) {
            console.error('init-db.sql not found!');
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing SQL script...');
        
        await client.query(sql);
        console.log('Database initialization completed successfully!');

    } catch (err) {
        console.error('Error executing SQL script:', err);
    } finally {
        await client.end();
    }
}

initDB();

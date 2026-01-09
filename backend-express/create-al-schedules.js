const { Client } = require('pg');
require('dotenv').config();

async function createALSchedulesTable() {
    const config = {
        user: process.env.DB_USER || 'virgi',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'akreditasi',
        password: process.env.DB_PASSWORD || 'virgi123',
        port: process.env.DB_PORT || 5432,
    };

    console.log(`Connecting to PostgreSQL database '${config.database}'...`);
    
    const client = new Client(config);

    try {
        await client.connect();
        console.log('Connected successfully!');
        
        // Create al_schedules table
        console.log('Creating al_schedules table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS al_schedules (
                id SERIAL PRIMARY KEY,
                submission_id VARCHAR(255) UNIQUE NOT NULL,
                proposed_date TIMESTAMP NOT NULL,
                proposed_end_date TIMESTAMP,
                proposed_venue TEXT NOT NULL,
                proposed_by UUID REFERENCES users(id),
                proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
                approved_by UUID REFERENCES users(id),
                approved_at TIMESTAMP,
                approval_notes TEXT,
                rejection_reason TEXT,
                flow_a_completed BOOLEAN DEFAULT FALSE,
                flow_a_completed_at TIMESTAMP,
                flow_b_completed BOOLEAN DEFAULT FALSE,
                flow_b_completed_at TIMESTAMP,
                sync_completed BOOLEAN DEFAULT FALSE,
                sync_completed_at TIMESTAMP,
                ready_for_al BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Table created!');

        // Create indexes
        console.log('Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_al_schedules_submission_id ON al_schedules(submission_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_al_schedules_status ON al_schedules(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_al_schedules_proposed_date ON al_schedules(proposed_date)`);
        console.log('Indexes created!');

        // Create trigger (may already exist)
        try {
            await client.query(`
                CREATE TRIGGER update_al_schedules_updated_at 
                BEFORE UPDATE ON al_schedules 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
            `);
            console.log('Trigger created!');
        } catch (e) {
            if (e.code === '42710') {
                console.log('Trigger already exists, skipping...');
            } else {
                throw e;
            }
        }

        console.log('\\nAL Schedules table setup completed successfully!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

createALSchedulesTable();

const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
    const connectionString = process.env.DIRECT_URL;
    console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

    const client = new Client({
        connectionString: connectionString,
    });

    try {
        await client.connect();
        console.log('✅ Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:');
        console.error(err.message);
        process.exit(1);
    }
}

testConnection();

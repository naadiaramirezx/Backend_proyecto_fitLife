// config/database.js

const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.swkyeicshozkypnvxznk.supabase.co:5432/postgres", 
    ssl: {
        rejectUnauthorized: false 
    }
});

const query = (text, params) => {
    return pool.query(text, params);
};

console.log('Base de datos conectada.');

module.exports = {
    query,
};  
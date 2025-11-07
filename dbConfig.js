require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,                  // false for local dev
        trustServerCertificate: true,    // must be inside options
        port: parseInt(process.env.DB_PORT) || 1433,
        connectionTimeout: 60000
    }
};



module.exports = { dbConfig };

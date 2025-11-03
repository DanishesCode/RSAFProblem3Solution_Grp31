const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Load environment variables FIRST
dotenv.config();

// Import dbConfig AFTER loading environment variables
const dbConfig = require("./dbconfig.js");


// Create Express app
const app = express();
const port = process.env.PORT || 3000;
// Custom CORS middleware MUST be first to ensure headers are set for all requests
app.use(cors({
    origin: [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:5504',
        'http://127.0.0.1:5504'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware
app.use(express.json());
app.use(cookieParser());


// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded images at /uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve MVC files for browser-side loading
app.use('/middlewares', express.static(path.join(__dirname, 'middlewares')));
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use('/controllers', express.static(path.join(__dirname, 'controllers')));








// Start server
app.listen(port, async () => {
    try {
        await sql.connect(dbConfig);
        console.log("Database connected");
                
    } catch (err) {
        console.error("DB connection error:", err);
        process.exit(1);
    }
    console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("Server is gracefully shutting down");
    await sql.close();
    console.log("Database connections closed");
    process.exit(0);
});
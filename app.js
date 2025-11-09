const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
const githubController = require("./controllers/githubController");

// Load environment variables FIRST
dotenv.config();

// Import dbConfig AFTER loading environment variables
const { dbConfig } = require('./dbConfig');


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

// Serve MVC files for browser-side loading
app.use('/middlewares', express.static(path.join(__dirname, 'middlewares')));
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use('/controllers', express.static(path.join(__dirname, 'controllers')));

//controller variables




// Routes
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public/login/login.html")));
app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    res.send(`<h1>Welcome, ${req.user.displayName || req.user.username}</h1>
              <img src="${req.user.photo}" width="100"/><br>
              <a href="/logout">Logout</a>`);
});

//github login Routes
app.get("/github", githubController.githubRedirect);
app.get("/github/callback", githubController.githubCallback);




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
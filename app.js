const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");

const githubController = require("./controllers/githubController");
const taskController = require("./controllers/taskController");
const GeminiController = require('./controllers/geminiController');
const OpenAIController = require('./controllers/openaiController');

// Load env BEFORE db config
dotenv.config();

// dbConfig AFTER dotenv
const { dbConfig } = require('./dbConfig');

// Initialize app
const app = express();
const port = process.env.PORT || 3000;

// --- CORS (must be first) ---
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

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// MVC folder exposure
app.use('/middlewares', express.static(path.join(__dirname, 'middlewares')));
app.use('/models', express.static(path.join(__dirname, 'models')));
app.use('/controllers', express.static(path.join(__dirname, 'controllers')));

// ---------------- ROUTES ----------------

// Login pages
app.get("/login", (req, res) =>
    res.sendFile(path.join(__dirname, "public/login/login.html"))
);

// Dashboard
app.get("/dashboard", (req, res) => {
    if (!req.isAuthenticated()) return res.redirect("/login");
    res.send(`
        <h1>Welcome, ${req.user.displayName || req.user.username}</h1>
        <img src="${req.user.photo}" width="100"/><br>
        <a href="/logout">Logout</a>
    `);
});

// ----- GitHub OAuth -----
app.get("/github", githubController.githubRedirect);
app.get("/github/callback", githubController.githubCallback);

// ----- Backlogs -----
app.get("/backlog/getUserLogs", taskController.getBacklogsByUser);
app.post("/backlog/save", taskController.createBacklog);
app.put("/backlog/status-update", taskController.updateStatus);

// ----- GEMINI API -----
app.post('/ai/gemini/generate', GeminiController.generateResponse);
app.post('/ai/gemini/stream', GeminiController.streamResponse);

// ----- CHATGPT / OPENAI API -----
app.post('/ai/openai/generate', OpenAIController.generateResponse);
app.post('/ai/openai/stream', OpenAIController.streamResponse);

// -------------------------------------------------------------

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
    console.log("Shutting down server...");
    await sql.close();
    console.log("DB closed");
    process.exit(0);
});

module.exports = app;

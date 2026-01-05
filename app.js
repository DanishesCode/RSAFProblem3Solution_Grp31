const express = require('express');
const sql = require('mssql');
const dotenv = require('dotenv');
const path = require("path");
const http = require("http");
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
        'http://127.0.0.1:5504',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
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

// ----- GitHub OAuth -----
app.get("/github", githubController.githubRedirect);
app.get("/github/callback", githubController.githubCallback);

// ----- Backlogs -----
app.get("/backlog/getUserLogs", taskController.getBacklogsByUser);
app.post("/backlog/save", taskController.createBacklog);
app.put("/backlog/status-update", taskController.updateStatus);

// ----- GEMINI API -----
app.post('/ai/gemini/generate', GeminiController.generateResponse);

// ----- CHATGPT / OPENAI API -----
app.post('/ai/openai/generate', OpenAIController.generateResponse);
app.post('/ai/openai/stream', OpenAIController.streamResponse);

// Vite integration for development
async function setupVite() {
    if (process.env.NODE_ENV !== 'production') {
        try {
            const { createServer } = require('vite');
            const vite = await createServer({
                server: {
                    middlewareMode: true,
                    // Disable HMR to remove websocket connections entirely
                    hmr: false,
                    watch: {
                        // Ignore editor/backup/temp files and common folders
                        ignored: ['**/*.old', '**/*.tmp', '**/*~', '**/*.swp', '**/.git/**', '**/node_modules/**']
                    }
                },
                appType: 'spa',
                root: __dirname
            });
            app.use(vite.middlewares);
            // Expose vite instance so we can inspect WS status from logs if needed
            globalThis.vite = vite;
            console.log('Vite middleware integrated');
        } catch (error) {
            console.error('Error setting up Vite:', error);
        }
    }
}

// Start server
async function startServer() {
    await setupVite();
    
    // Serve React app - set up after Vite middleware
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static(path.join(__dirname, 'dist')));
        // Catch-all handler for SPA routing in production
        app.use((req, res) => {
            // Skip if it's an API route
            if (req.path.startsWith('/github') || 
                req.path.startsWith('/backlog') || 
                req.path.startsWith('/ai')) {
                return res.status(404).send('Not found');
            }
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }
    // In development, Vite middleware handles all non-API routes
    
    // Create HTTP server explicitly so Vite's WebSocket server can attach reliably
    const server = http.createServer(app);

    server.listen(port, async () => {
        try {
            await sql.connect(dbConfig);
            console.log("Database connected");
        } catch (err) {
            console.error("DB connection error:", err);
            process.exit(1);
        }

        console.log(`Server running on port ${port}`);
        console.log(`React app available at http://localhost:${port}`);
    });

    // Helpful diagnostics: log WS connections/disconnections
    try {
        const ws = globalThis.vite?.ws;
        if (ws && ws.on) {
            ws.on('connection', () => console.log('Vite WS client connected'));
            ws.on('close', () => console.log('Vite WS client disconnected'));
        }
    } catch (e) {
        // ignore - diagnostics only
    }
}

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    await sql.close();
    console.log("DB closed");
    process.exit(0);
});

module.exports = app;

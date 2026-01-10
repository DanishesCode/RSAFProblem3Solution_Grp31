const express = require('express');
const dotenv = require('dotenv');
const path = require("path");
const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
// Load env
dotenv.config();
const githubController = require("./controllers/githubController");
const taskController = require("./controllers/taskController");
const GeminiController = require('./controllers/geminiController');
const OpenAIController = require('./controllers/openaiController');


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

// MVC folder exposure (optional, but kept as-is)
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
                    hmr: false,
                    watch: {
                        ignored: [
                            '**/*.old',
                            '**/*.tmp',
                            '**/*~',
                            '**/*.swp',
                            '**/.git/**',
                            '**/node_modules/**'
                        ]
                    }
                },
                appType: 'spa',
                root: __dirname
            });
            app.use(vite.middlewares);
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

    if (process.env.NODE_ENV === 'production') {
        app.use(express.static(path.join(__dirname, 'dist')));
        app.use((req, res) => {
            if (
                req.path.startsWith('/github') ||
                req.path.startsWith('/backlog') ||
                req.path.startsWith('/ai')
            ) {
                return res.status(404).send('Not found');
            }
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }

    const server = http.createServer(app);

    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`React app available at http://localhost:${port}`);
    });

    // Optional Vite WS diagnostics
    try {
        const ws = globalThis.vite?.ws;
        if (ws && ws.on) {
            ws.on('connection', () => console.log('Vite WS client connected'));
            ws.on('close', () => console.log('Vite WS client disconnected'));
        }
    } catch {
        // diagnostics only
    }
}

startServer();

module.exports = app;

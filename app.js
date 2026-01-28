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
const OpenRouterController = require('./controllers/openrouterController');
const boardController = require("./controllers/boardController");
const chatController = require("./controllers/chatController");

// Load env
dotenv.config();

// Initialize app
const app = express();
const port = process.env.PORT || 3000;

// --- CORS (keep yours / adjust if needed) ---
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5504",
      "http://127.0.0.1:5504",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// ----------------------------------------------------
// (A) BLOCK serving JSX directly EXCEPT /src/* (Vite dev)
// ----------------------------------------------------
app.use((req, res, next) => {
  if (req.path.endsWith(".jsx") && !req.path.startsWith("/src/")) {
    return res.status(404).send("Not found");
  }
  next();
});


// ----------------------------------------------------
// (C) API ROUTES (yours)
// ----------------------------------------------------

//CollabBoardCreate
app.post("/boards", boardController.createBoard);
app.get("/users/:userId/boards", boardController.listBoardsForUser);
app.get("/boards/:boardId", boardController.getBoard);
app.post("/boards/:boardId", boardController.updateBoard);
app.delete("/boards/:boardId", boardController.deleteBoard);
app.post("/boards/:boardId/members", boardController.addMembers);

// Board chat (collab boards only)
app.get("/boards/:boardId/chat/messages", chatController.listMessages);
app.post("/boards/:boardId/chat/messages", chatController.sendMessage);
app.get("/boards/:boardId/chat/unread", chatController.getUnread);
app.post("/boards/:boardId/chat/read", chatController.markRead);

// GitHub OAuth
app.get("/github", githubController.githubRedirect);
app.get("/github/callback", githubController.githubCallback);
app.get("/users/github/:githubId", githubController.getUserByGithubId);
app.post("/github/push-code", githubController.pushCodeToGitHub);

// Backlogs
app.get("/backlog/getUserLogs", taskController.getBacklogsByUser);
app.get("/backlog/getBoardLogs", taskController.getBacklogsByBoard);
app.post("/backlog/save", taskController.createBacklog);
app.put("/backlog/update", taskController.updateBacklog);
app.put("/backlog/status-update", taskController.updateStatus);
app.put("/backlog/update-agent-output", taskController.updateAgentOutput);
app.delete("/backlog/delete", taskController.deleteBacklog);

// Gemini
app.post("/ai/gemini/generate", GeminiController.generateResponse);
app.post("/ai/gemini/process-task", GeminiController.processTask);

// OpenAI
app.post("/ai/openai/generate", OpenAIController.generateResponse);
app.post("/ai/openai/stream", OpenAIController.streamResponse);

// OpenRouter (no streaming; one-shot only)
app.post("/ai/openrouter/generate", OpenRouterController.generateResponse);
app.post("/ai/openrouter/process-task", OpenRouterController.processTask);

// ----------------------------------------------------
// (D) VITE MIDDLEWARE (DEV) - BEFORE static
// ----------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = require("vite");
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false, // keep as you had
      },
      appType: "spa",
      root: __dirname,
    });

    app.use(vite.middlewares);
    globalThis.vite = vite;
    console.log("Vite middleware integrated (dev mode)");
  }
}

// ----------------------------------------------------
// (E) START SERVER
// ----------------------------------------------------
async function startServer() {
  await setupVite();

  // IMPORTANT: Serve public assets but do NOT let it serve public/index.html at "/"
  // This prevents your main React site from being replaced by public/index.html


  app.use(express.static(path.join(__dirname, "public"), { index: false }));

  // DEV: Serve the Vite React app for "/" and other non-API routes
  if (process.env.NODE_ENV !== "production") {
    const fs = require("fs");

    app.use(async (req, res, next) => {
      // Don't swallow API/login routes
    if (
     req.path.startsWith("/github") ||
     req.path.startsWith("/backlog") ||
     req.path.startsWith("/boards") ||
     req.path.startsWith("/ai") ||
     req.path.startsWith("/login")
   ) {
    return next();
    }


      try {
        const vite = globalThis.vite;
        const url = req.originalUrl;

        // This must be your React index.html at project root (NOT public/index.html)
        const indexPath = path.join(__dirname, "index.html");
        let html = fs.readFileSync(indexPath, "utf-8");
        html = await vite.transformIndexHtml(url, html);

        return res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        return next(err);
      }
    });
  }

  // Production: serve built React app from dist
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "dist")));

    // SPA fallback (but don't swallow API routes)
    app.use((req, res) => {
      if (
        req.path.startsWith("/github") ||
        req.path.startsWith("/backlog") ||
        req.path.startsWith("/ai") ||
        req.path === "/login"
      ) {
        return res.status(404).send("Not found");
      }

      return res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const server = http.createServer(app);

  // --- Socket.IO ---
  const { Server } = require("socket.io");
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5504",
        "http://127.0.0.1:5504",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ],
      credentials: true,
    },
  });

  app.set("io", io);

  io.on("connection", (socket) => {
    socket.on("joinBoard", (boardId) => {
      if (!boardId) return;
      socket.join(`board:${boardId}`);
    });

    socket.on("leaveBoard", (boardId) => {
      if (!boardId) return;
      socket.leave(`board:${boardId}`);
    });
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();

module.exports = app;

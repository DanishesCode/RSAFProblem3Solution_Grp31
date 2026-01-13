// server/controllers/boardController.js
const BoardModel = require("../models/boardModel");

exports.createBoard = async (req, res) => {
  try {
    const { name, repo, ownerId, type, memberIds } = req.body;

    if (!name || !repo || !ownerId) {
      return res.status(400).json({ error: "name, repo, ownerId are required" });
    }

    const board = await BoardModel.createBoard({
      name: String(name).trim(),
      repo: String(repo).trim(),
      ownerId: String(ownerId),
      type: type === "collab" ? "collab" : "personal",
      memberIds: Array.isArray(memberIds) ? memberIds : [],
    });

    res.status(201).json(board);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create board" });
  }
};

exports.listBoardsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const boards = await BoardModel.listBoardsForUser(String(userId));
    res.json(boards);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to list boards" });
  }
};

exports.getBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const board = await BoardModel.getBoard(boardId);
    if (!board) return res.status(404).json({ error: "Board not found" });
    res.json(board);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to get board" });
  }
};

exports.updateBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const updates = req.body || {};
    const updated = await BoardModel.updateBoard(boardId, updates);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update board" });
  }
};

exports.deleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    await BoardModel.deleteBoard(boardId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to delete board" });
  }
};

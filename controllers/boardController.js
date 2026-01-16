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
    const { type } = req.query; // Optional query parameter to filter by type
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    console.log(`[boardController] Listing boards for userId: ${userId}, type: ${type || 'all'}`);
    
    let boards;
    if (type === "personal") {
      boards = await BoardModel.listPersonalBoardsForUser(String(userId));
    } else if (type === "collab") {
      boards = await BoardModel.listCollabBoardsForUser(String(userId));
    } else {
      boards = await BoardModel.listBoardsForUser(String(userId));
    }
    
    console.log(`[boardController] Found ${boards.length} boards`);
    res.json(boards);
  } catch (err) {
    console.error("[boardController] Error listing boards:", err);
    res.status(400).json({ 
      error: err.message || "Failed to list boards",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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

exports.addMembers = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { memberIds } = req.body;
    
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: "memberIds must be a non-empty array" });
    }
    
    const updated = await BoardModel.addMembersToBoard(boardId, memberIds);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to add members" });
  }
};

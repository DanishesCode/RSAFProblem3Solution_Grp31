// server/controllers/chatController.js
// Board-scoped chat (collab boards only)

const BoardModel = require("../models/boardModel");
const ChatModel = require("../models/chatModel");

function emitToBoard(req, boardId, event, payload) {
  try {
    const io = req.io || req.app.get("io");
    if (!io) return;
    if (!boardId) return;
    io.to(`board:${String(boardId)}`).emit(event, payload);
  } catch (e) {
    console.warn("Socket emit failed:", e?.message || e);
  }
}

async function requireCollabMember(boardId, userId) {
  const board = await BoardModel.getBoard(boardId);
  if (!board) {
    const err = new Error("Board not found");
    err.status = 404;
    throw err;
  }
  if (board.type !== "collab") {
    const err = new Error("Chat is available for collab boards only");
    err.status = 403;
    throw err;
  }
  const members = board.memberIds || [];
  if (!userId || !members.includes(String(userId))) {
    const err = new Error("Not a member of this board");
    err.status = 403;
    throw err;
  }
  return board;
}

exports.listMessages = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.query.userId;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);

    await requireCollabMember(boardId, userId);

    const messages = await ChatModel.listBoardMessages(boardId, { limit });
    res.json({ messages });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to list messages" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId, text } = req.body || {};

    await requireCollabMember(boardId, userId);

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const msg = await ChatModel.addBoardMessage(boardId, {
      senderId: String(userId),
      text: String(text).trim(),
    });

    // Realtime: push to all members currently viewing this board
    emitToBoard(req, boardId, "chatMessage", { message: msg });

    res.status(201).json(msg);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to send message" });
  }
};

exports.getUnread = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.query.userId;

    await requireCollabMember(boardId, userId);

    const unread = await ChatModel.getBoardUnread(boardId, String(userId));
    res.json(unread);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to get unread" });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { userId } = req.body || {};

    await requireCollabMember(boardId, userId);

    await ChatModel.markBoardRead(boardId, String(userId));
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to mark read" });
  }
};

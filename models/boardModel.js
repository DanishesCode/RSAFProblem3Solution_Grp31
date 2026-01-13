// server/models/boardModel.js
const { db, admin } = require("../firebaseAdmin");

const now = () => admin.firestore.FieldValue.serverTimestamp();

async function createBoard({ name, repo, ownerId, type = "personal", memberIds = [] }) {
  const boardRef = db.collection("boards").doc();

  const safeType = type === "collab" ? "collab" : "personal";

  const members =
    safeType === "collab"
      ? Array.from(new Set([ownerId, ...(memberIds || [])])).filter(Boolean)
      : [ownerId];

  const data = {
    name,
    repo,
    type: safeType,
    ownerId,
    memberIds: members,
    createdAt: now(),
    updatedAt: now(),
  };

  await boardRef.set(data);
  return { id: boardRef.id, ...data };
}

async function getBoard(boardId) {
  const snap = await db.collection("boards").doc(boardId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function listBoardsForUser(userId) {
  const snap = await db
    .collection("boards")
    .where("memberIds", "array-contains", userId)
    .orderBy("updatedAt", "desc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function updateBoard(boardId, updates) {
  const ref = db.collection("boards").doc(boardId);
  await ref.update({ ...updates, updatedAt: now() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

async function deleteBoard(boardId) {
  await db.collection("boards").doc(boardId).delete();
  return true;
}

module.exports = {
  createBoard,
  getBoard,
  listBoardsForUser,
  updateBoard,
  deleteBoard,
};

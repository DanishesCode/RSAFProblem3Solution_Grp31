// server/models/boardModel.js
const { db, admin } = require("../firebaseAdmin");

const now = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Safely extract a timestamp (ms) from Firestore Timestamp or {_seconds}
 */
function getTime(ts) {
  if (ts && typeof ts.toMillis === "function") {
    return ts.toMillis();
  }
  if (ts && typeof ts._seconds === "number") {
    return ts._seconds * 1000;
  }
  return 0;
}

async function createBoard({ name, repo, ownerId, type = "personal", memberIds = [] }) {
  const boardRef = db.collection("boards").doc();

  const safeType = type === "collab" ? "collab" : "personal";

  const members =
    safeType === "collab"
      ? Array.from(new Set([ownerId].concat(memberIds || []))).filter(Boolean)
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

async function listCollabBoardsForUser(userId) {
  try {
    const snap = await db
      .collection("boards")
      .where("memberIds", "array-contains", userId)
      .where("type", "==", "collab")
      .orderBy("updatedAt", "desc")
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    const msg = error && error.message ? error.message : "";
    const isIndexError =
      error.code === 9 ||
      error.code === "FAILED_PRECONDITION" ||
      msg.includes("index") ||
      msg.includes("requires an index");

    if (!isIndexError) throw error;

    console.warn("[boardModel] Missing index for collab boards, using fallback");

    try {
      const snap = await db
        .collection("boards")
        .where("memberIds", "array-contains", userId)
        .get();

      const allBoards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const collabBoards = allBoards.filter((b) => b.type === "collab");

      collabBoards.sort((a, b) => {
        const aTime = getTime(a.updatedAt) || getTime(a.createdAt);
        const bTime = getTime(b.updatedAt) || getTime(b.createdAt);
        return bTime - aTime;
      });

      return collabBoards;
    } catch (fallbackError) {
      console.error("[boardModel] Collab fallback failed:", fallbackError);
      throw fallbackError;
    }
  }
}

async function listPersonalBoardsForUser(userId) {
  try {
    const snap = await db
      .collection("boards")
      .where("memberIds", "array-contains", userId)
      .where("type", "==", "personal")
      .orderBy("updatedAt", "desc")
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    const msg = error && error.message ? error.message : "";
    const isIndexError =
      error.code === 9 ||
      error.code === "FAILED_PRECONDITION" ||
      msg.includes("index") ||
      msg.includes("requires an index");

    if (!isIndexError) throw error;

    console.warn("[boardModel] Missing index for personal boards, using fallback");

    try {
      const snap = await db
        .collection("boards")
        .where("memberIds", "array-contains", userId)
        .get();

      const allBoards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const personalBoards = allBoards.filter((b) => b.type === "personal");

      personalBoards.sort((a, b) => {
        const aTime = getTime(a.updatedAt) || getTime(a.createdAt);
        const bTime = getTime(b.updatedAt) || getTime(b.createdAt);
        return bTime - aTime;
      });

      return personalBoards;
    } catch (fallbackError) {
      console.error("[boardModel] Personal fallback failed:", fallbackError);
      throw fallbackError;
    }
  }
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

async function addMembersToBoard(boardId, memberIds) {
  const ref = db.collection("boards").doc(boardId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Board not found");
  }

  const currentMemberIds = snap.data().memberIds || [];
  const newMemberIds = Array.from(
    new Set(currentMemberIds.concat(memberIds))
  ).filter(Boolean);

  await ref.update({
    memberIds: newMemberIds,
    updatedAt: now(),
  });

  const updated = await ref.get();
  return { id: updated.id, ...updated.data() };
}

module.exports = {
  createBoard,
  getBoard,
  listBoardsForUser,
  listPersonalBoardsForUser,
  listCollabBoardsForUser,
  updateBoard,
  deleteBoard,
  addMembersToBoard,
};

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

async function listPersonalBoardsForUser(userId) {
  try {
    // Try query with both filters (requires composite index)
    const snap = await db
      .collection("boards")
      .where("memberIds", "array-contains", userId)
      .where("type", "==", "personal")
      .orderBy("updatedAt", "desc")
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // Fallback: fetch all user boards and filter by type in JavaScript
    // This happens if composite index doesn't exist yet
    // Firestore error codes: 9 = FAILED_PRECONDITION (index needed)
    const isIndexError = 
      error.code === 9 || 
      error.code === 'FAILED_PRECONDITION' ||
      error.message?.includes("index") ||
      error.message?.includes("requires an index");
    
    if (isIndexError) {
      console.warn("[boardModel] Composite index missing, using fallback filter. Error:", error.message);
      try {
        // Fallback 1: Try with orderBy on memberIds query
        try {
          const snap = await db
            .collection("boards")
            .where("memberIds", "array-contains", userId)
            .orderBy("updatedAt", "desc")
            .get();

          const allBoards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const personalBoards = allBoards.filter((board) => board.type === "personal");
          // Sort by updatedAt manually if available
          personalBoards.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?._seconds || 0;
            const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?._seconds || 0;
            return bTime - aTime;
          });
          console.log(`[boardModel] Fallback: Found ${allBoards.length} total boards, ${personalBoards.length} personal`);
          return personalBoards;
        } catch (orderByError) {
          // Fallback 2: No orderBy, just filter
          console.warn("[boardModel] orderBy also failed, using simple filter");
          const snap = await db
            .collection("boards")
            .where("memberIds", "array-contains", userId)
            .get();

          const allBoards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const personalBoards = allBoards.filter((board) => board.type === "personal");
          // Sort by updatedAt manually if available
          personalBoards.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?._seconds || a.createdAt?.toMillis?.() || a.createdAt?._seconds || 0;
            const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?._seconds || b.createdAt?.toMillis?.() || b.createdAt?._seconds || 0;
            return bTime - aTime;
          });
          console.log(`[boardModel] Simple filter: Found ${allBoards.length} total boards, ${personalBoards.length} personal`);
          return personalBoards;
        }
      } catch (fallbackError) {
        console.error("[boardModel] All fallback queries failed:", fallbackError);
        throw fallbackError;
      }
    }
    console.error("[boardModel] Query failed with error:", error);
    throw error;
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

module.exports = {
  createBoard,
  getBoard,
  listBoardsForUser,
  listPersonalBoardsForUser,
  updateBoard,
  deleteBoard,
};

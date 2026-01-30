// server/models/chatModel.js

const { db, admin } = require("../firebaseAdmin");

const serverNow = () => admin.firestore.FieldValue.serverTimestamp();

async function getSenderName(senderId) {
  try {
    // Your users collection is named "user" (not "users")
    const snap = await db.collection("user").doc(String(senderId)).get();
    if (snap.exists) {
      const data = snap.data() || {};
      return data.githubName || data.githubId || `User ${senderId}`;
    }
  } catch (e) {
    // ignore and fall back
  }
  return `User ${senderId}`;
}

function boardMessagesRef(boardId) {
  return db.collection("boards").doc(String(boardId)).collection("messages");
}

function boardReadStateRef(boardId, userId) {
  return db
    .collection("boards")
    .doc(String(boardId))
    .collection("readState")
    .doc(String(userId));
}

async function listBoardMessages(boardId, { limit = 50 } = {}) {
  const snap = await boardMessagesRef(boardId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  // Return oldest -> newest for easy UI rendering
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .reverse();
}

async function addBoardMessage(boardId, { senderId, text }) {
  const senderName = await getSenderName(senderId);
  const ref = boardMessagesRef(boardId).doc();

  const data = {
    boardId: String(boardId),
    roomType: "board",
    senderId: String(senderId),
    senderName,
    text: String(text),
    createdAt: serverNow(),
  };

  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getBoardUnread(boardId, userId) {
  const readSnap = await boardReadStateRef(boardId, userId).get();
const data = readSnap.exists ? readSnap.data() : null;
const lastReadAt = data ? data.lastReadAt : null;


  // We only need a boolean (dot badge) to keep reads cheap.
  // Query: is there at least 1 message newer than lastReadAt?
  let q = boardMessagesRef(boardId).orderBy("createdAt", "desc").limit(1);
  if (lastReadAt) {
    q = boardMessagesRef(boardId)
      .where("createdAt", ">", lastReadAt)
      .orderBy("createdAt", "desc")
      .limit(1);
  }

  const unreadSnap = await q.get();
  const hasUnread = !unreadSnap.empty;

  return { hasUnread };
}

async function markBoardRead(boardId, userId) {
  await boardReadStateRef(boardId, userId).set(
    {
      lastReadAt: serverNow(),
    },
    { merge: true }
  );
}

module.exports = {
  listBoardMessages,
  addBoardMessage,
  getBoardUnread,
  markBoardRead,
};

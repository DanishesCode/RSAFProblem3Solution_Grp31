const { db } = require("../firebaseAdmin");

const TASKS = "task";
const AGENTS = "agent";

async function createBacklogItem(data) {
  try {
    const doc = {
      userId: String(data.userId),
      agentId: String(data.agentId),

      title: data.title || "",
      description: data.description || "",
      priority: data.priority || "medium",
      status: data.status || "toDo",

      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      acceptCrit: Array.isArray(data.acceptCrit) ? data.acceptCrit : [],
      agentProcess: [],

      repo: data.repo || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await db.collection(TASKS).add(doc);

    return {
      taskId: ref.id,
      ...doc
    };
  } catch (err) {
    console.error("Firestore createBacklogItem error:", err);
    throw err;
  }
}

async function updateBacklogItemStatus(taskId, status) {
  try {
    const ref = db.collection(TASKS).doc(String(taskId));

    await ref.update({
      status,
      updatedAt: new Date()
    });

    const snap = await ref.get();
    if (!snap.exists) return null;

    return {
      taskId: snap.id,
      ...snap.data()
    };
  } catch (err) {
    console.error("Firestore updateBacklogItemStatus error:", err);
    throw err;
  }
}

async function getBacklogsByUserId(userId) {
  try {
    const snap = await db
      .collection(TASKS)
      .where("userId", "==", String(userId))
      .get();

    const results = await Promise.all(
      snap.docs.map(async (doc) => {
        const task = { taskId: doc.id, ...doc.data() };

        // JOIN agent
        if (task.agentId) {
          const agentSnap = await db.collection(AGENTS).doc(task.agentId).get();
          if (agentSnap.exists) {
            task.agentName = agentSnap.data().agentName;
            task.agentSpecial = agentSnap.data().agentSpecial;
          }
        }

        return task;
      })
    );

    return results;
  } catch (err) {
    console.error("Firestore getBacklogsByUserId error:", err);
    throw err;
  }
}

module.exports = {
  createBacklogItem,
  updateBacklogItemStatus,
  getBacklogsByUserId
};

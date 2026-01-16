const { db } = require("../firebaseAdmin");

const TASKS = "task";
const AGENTS = "agent";

async function createBacklogItem(data) {
  try {
    // Convert requirements array to string (comma-separated)
    let requirementString = "";
    if (Array.isArray(data.requirements) && data.requirements.length > 0) {
      requirementString = data.requirements.join(", ");
    } else if (typeof data.requirements === "string") {
      requirementString = data.requirements;
    }

    const doc = {
      // Core fields
      title: data.title || "",
      prompt: data.prompt || "", // Required field
      description: data.description || "", // Optional field
      priority: data.priority || "medium",
      status: data.status || "toDo",
      repo: data.repo || "",
      
      // User and board fields
      ownerId: String(data.ownerId || data.userId || ""),
      boardId: data.boardId || "",
      
      // Agent fields
      agentName: data.agentName || "",
      agentOutput: data.agentOutput || "",
      
      // Requirement as string
      requirement: requirementString,
      
      // Timestamps
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

async function updateTaskAgentOutput(taskId, agentOutput) {
  try {
    const ref = db.collection(TASKS).doc(String(taskId));

    await ref.update({
      agentOutput: agentOutput || "",
      updatedAt: new Date()
    });

    const snap = await ref.get();
    if (!snap.exists) return null;

    return {
      taskId: snap.id,
      ...snap.data()
    };
  } catch (err) {
    console.error("Firestore updateTaskAgentOutput error:", err);
    throw err;
  }
}

async function getBacklogsByUserId(userId) {
  try {
    const snap = await db
      .collection(TASKS)
      .where("ownerId", "==", String(userId))
      .get();

    const results = snap.docs.map((doc) => {
      const data = doc.data();
      const task = { 
        taskId: doc.id,
        title: data.title || "",
        prompt: data.prompt || "",
        priority: data.priority || "medium",
        status: data.status || "toDo",
        repo: data.repo || "",
        ownerId: data.ownerId || "",
        boardId: data.boardId || "",
        agentName: data.agentName || "",
        agentOutput: data.agentOutput || "",
        requirement: data.requirement || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return task;
    });

    return results;
  } catch (err) {
    console.error("Firestore getBacklogsByUserId error:", err);
    throw err;
  }
}

async function getBacklogsByBoardId(boardId) {
  try {
    const snap = await db
      .collection(TASKS)
      .where("boardId", "==", String(boardId))
      .get();

    const results = snap.docs.map((doc) => {
      const data = doc.data();
      const task = { 
        taskId: doc.id,
        title: data.title || "",
        prompt: data.prompt || "",
        description: data.description || "",
        priority: data.priority || "medium",
        status: data.status || "toDo",
        repo: data.repo || "",
        ownerId: data.ownerId || "",
        boardId: data.boardId || "",
        agentName: data.agentName || "",
        agentOutput: data.agentOutput || "",
        requirement: data.requirement || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return task;
    });

    return results;
  } catch (err) {
    console.error("Firestore getBacklogsByBoardId error:", err);
    throw err;
  }
}

module.exports = {
  createBacklogItem,
  updateBacklogItemStatus,
  updateTaskAgentOutput,
  getBacklogsByUserId,
  getBacklogsByBoardId
};

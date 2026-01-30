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

async function updateBacklogItem(taskId, data) {
  try {
    // Convert requirements array to string (comma-separated)
    let requirementString = "";
    if (Array.isArray(data.requirements) && data.requirements.length > 0) {
      requirementString = data.requirements.join(", ");
    } else if (typeof data.requirements === "string") {
      requirementString = data.requirements;
    }

    const ref = db.collection(TASKS).doc(String(taskId));

    // Check if document exists
    const snap = await ref.get();
    if (!snap.exists) {
      return null;
    }

    // Update only the fields that are provided
    const updateData = {
      updatedAt: new Date()
    };

    if (data.title !== undefined) updateData.title = data.title || "";
    if (data.prompt !== undefined) updateData.prompt = data.prompt || "";
    if (data.description !== undefined) updateData.description = data.description || "";
    if (data.priority !== undefined) updateData.priority = data.priority || "medium";
    if (data.status !== undefined) updateData.status = data.status || "toDo";
    if (data.repo !== undefined) updateData.repo = data.repo || "";
    if (data.ownerId !== undefined) updateData.ownerId = String(data.ownerId || "");
    if (data.boardId !== undefined) updateData.boardId = data.boardId || "";
    if (data.agentName !== undefined) updateData.agentName = data.agentName || "";
    if (data.agentOutput !== undefined) updateData.agentOutput = data.agentOutput || "";
    if (requirementString !== undefined) updateData.requirement = requirementString;

    await ref.update(updateData);

    const updatedSnap = await ref.get();
    return {
      taskId: updatedSnap.id,
      ...updatedSnap.data()
    };
  } catch (err) {
    console.error("Firestore updateBacklogItem error:", err);
    throw err;
  }
}

async function getBacklogsByUserId(userId) {
  try {
    const snap = await db
      .collection(TASKS)
      .where("ownerId", "==", String(userId))
      .get();

    const results = await Promise.all(snap.docs.map(async (doc) => {
      const data = doc.data();
      
      // Fetch owner's GitHub name
      let ownerName = "";
      try {
        const userDoc = await db.collection("users").doc(String(data.ownerId)).get();
        if (userDoc.exists) {
          ownerName = userDoc.data().githubName || String(data.ownerId);
        } else {
          ownerName = String(data.ownerId);
        }
      } catch (err) {
        ownerName = String(data.ownerId);
      }
      
      const task = { 
        taskId: doc.id,
        title: data.title || "",
        prompt: data.prompt || "",
        description: data.description || "",
        priority: data.priority || "medium",
        status: data.status || "toDo",
        repo: data.repo || "",
        ownerId: data.ownerId || "",
        ownerName: ownerName,
        boardId: data.boardId || "",
        agentName: data.agentName || "",
        agentOutput: data.agentOutput || "",
        requirement: data.requirement || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return task;
    }));

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

    const results = await Promise.all(snap.docs.map(async (doc) => {
      const data = doc.data();
      
      // Fetch owner's GitHub name
      let ownerName = "";
      try {
        const userDoc = await db.collection("users").doc(String(data.ownerId)).get();
        if (userDoc.exists) {
          ownerName = userDoc.data().githubName || String(data.ownerId);
        } else {
          ownerName = String(data.ownerId);
        }
      } catch (err) {
        ownerName = String(data.ownerId);
      }
      
      const task = { 
        taskId: doc.id,
        title: data.title || "",
        prompt: data.prompt || "",
        description: data.description || "",
        priority: data.priority || "medium",
        status: data.status || "toDo",
        repo: data.repo || "",
        ownerId: data.ownerId || "",
        ownerName: ownerName,
        boardId: data.boardId || "",
        agentName: data.agentName || "",
        agentOutput: data.agentOutput || "",
        requirement: data.requirement || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      return task;
    }));

    return results;
  } catch (err) {
    console.error("Firestore getBacklogsByBoardId error:", err);
    throw err;
  }
}

async function deleteBacklogItem(taskId) {
  try {
    const ref = db.collection(TASKS).doc(String(taskId));
    const snap = await ref.get();
    
    if (!snap.exists) {
      return null;
    }

    await ref.delete();
    return { taskId, deleted: true };
  } catch (err) {
    console.error("Firestore deleteBacklogItem error:", err);
    throw err;
  }
}

module.exports = {
  createBacklogItem,
  updateBacklogItemStatus,
  updateTaskAgentOutput,
  updateBacklogItem,
  deleteBacklogItem,
  getBacklogsByUserId,
  getBacklogsByBoardId
};

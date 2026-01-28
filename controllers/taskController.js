const taskModel = require("../models/taskModel");

/**
 * Helper: safely parse JSON arrays that may come in as:
 * - actual arrays: ["a","b"]
 * - JSON strings: '["a","b"]'
 * - empty / undefined
 */
function normalizeArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // if it's a plain string like "one requirement"
      return [trimmed];
    }
  }

  return [];
}

/**
 * GET /backlog/getUserLogs?userId=...
 */
async function getBacklogsByUser(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId in query" });
    }

    const backlogs = await taskModel.getBacklogsByUserId(userId);

    return res.status(200).json(backlogs);
  } catch (error) {
    console.error("getBacklogsByUser error:", error);
    return res.status(500).json({ error: "Failed to fetch backlogs" });
  }
}

/**
 * GET /backlog/getBoardLogs?boardId=...
 */
async function getBacklogsByBoard(req, res) {
  try {
    const { boardId } = req.query;

    if (!boardId) {
      return res.status(400).json({ error: "Missing boardId in query" });
    }

    const backlogs = await taskModel.getBacklogsByBoardId(boardId);

    return res.status(200).json(backlogs);
  } catch (error) {
    console.error("getBacklogsByBoard error:", error);
    return res.status(500).json({ error: "Failed to fetch backlogs" });
  }
}

/**
 * POST /backlog/save
 * Expected body (minimum):
 * {
 *   userId, agentId, title, description, priority, status,
 *   requirements, acceptCrit, repo
 * }
 */
async function createBacklog(req, res) {
  try {
    const body = req.body || {};

    const payload = {
      // Core fields
      title: body.title || "",
      prompt: body.prompt || "",
      description: body.description || "", // Optional field
      priority: body.priority || "medium",
      status: body.status || "toDo",
      repo: body.repo || "",
      
      // User and board fields
      ownerId: body.ownerId || body.userId || "",
      boardId: body.boardId || "",
      
      // Agent fields
      agentName: body.agentName || body.assignedAgent || "",
      agentOutput: body.agentOutput || "",
      
      // Requirements - keep as array for processing, model will convert to string
      requirements: normalizeArray(body.requirements),
    };

    // Minimal validation
    if (!payload.ownerId) {
      return res.status(400).json({ error: "Missing ownerId (or userId) in body" });
    }
    if (!payload.title || payload.title.trim() === "") {
      return res.status(400).json({ error: "Missing title in body" });
    }

    const created = await taskModel.createBacklogItem(payload);
    const io = req.app.get("io");
    if (io && payload.boardId) {
    io.to(`board:${payload.boardId}`).emit("taskCreated", created);
}


    return res.status(201).json(created);
  } catch (error) {
    console.error("createBacklog error:", error);
    return res.status(500).json({ error: "Failed to create backlog item" });
  }
}

/**
 * PUT /backlog/status-update
 * Expected body:
 * { taskId, status }
 *
 * (If your frontend sends taskid instead, we support that too.)
 */
async function updateStatus(req, res) {
  try {
    const { taskId, taskid, status } = req.body || {};

    const id = taskId || taskid;

    if (!id) {
      return res.status(400).json({ error: "Missing taskId in body" });
    }
    if (!status) {
      return res.status(400).json({ error: "Missing status in body" });
    }

    const updated = await taskModel.updateBacklogItemStatus(id, status);
    const io = req.app.get("io");
    if (io && updated?.boardId) {
  io.to(`board:${updated.boardId}`).emit("taskStatusUpdated", {
    taskId: updated.taskId || updated.taskid || id,
    status: updated.status,
    updated,
  });
}


    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateStatus error:", error);
    return res.status(500).json({ error: "Failed to update task status" });
  }
}

/**
 * PUT /backlog/update-agent-output
 * Expected body:
 * { taskId, agentOutput }
 */
async function updateAgentOutput(req, res) {
  try {
    const { taskId, taskid, agentOutput } = req.body || {};

    const id = taskId || taskid;

    if (!id) {
      return res.status(400).json({ error: "Missing taskId in body" });
    }

    const updated = await taskModel.updateTaskAgentOutput(id, agentOutput);

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    const io = req.app.get("io");
    if (io && updated?.boardId) {
    io.to(`board:${updated.boardId}`).emit("taskUpdated", updated);
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateAgentOutput error:", error);
    return res.status(500).json({ error: "Failed to update agent output" });
  }
}

/**
 * PUT /backlog/update
 * Expected body:
 * { taskId, title, prompt, description, priority, status, repo, ownerId, boardId, agentName, agentOutput, requirements }
 */
async function updateBacklog(req, res) {
  try {
    const body = req.body || {};
    const { taskId, taskid } = body;

    const id = taskId || taskid;

    if (!id) {
      return res.status(400).json({ error: "Missing taskId in body" });
    }

    const payload = {
      // Core fields
      title: body.title,
      prompt: body.prompt,
      description: body.description,
      priority: body.priority,
      status: body.status,
      repo: body.repo,
      
      // User and board fields
      ownerId: body.ownerId || body.userId,
      boardId: body.boardId,
      
      // Agent fields
      agentName: body.agentName || body.assignedAgent,
      agentOutput: body.agentOutput,
      
      // Requirements
      requirements: normalizeArray(body.requirements),
    };

    const updated = await taskModel.updateBacklogItem(id, payload);
    const io = req.app.get("io");
if (io && updated?.boardId) {
  io.to(`board:${updated.boardId}`).emit("taskUpdated", updated);
}


    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateBacklog error:", error);
    return res.status(500).json({ error: "Failed to update backlog item" });
  }
}

/**
 * DELETE /backlog/delete
 * Expected body:
 * { taskId }
 */
async function deleteBacklog(req, res) {
  try {
    const { taskId, taskid } = req.body || {};

    const id = taskId || taskid;

    if (!id) {
      return res.status(400).json({ error: "Missing taskId in body" });
    }

    const deleted = await taskModel.deleteBacklogItem(id);
    const io = req.app.get("io");
if (io && deleted?.boardId) {
  io.to(`board:${deleted.boardId}`).emit("taskDeleted", {
    taskId: deleted.taskId || deleted.taskid || id,
  });
}


    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json(deleted);
  } catch (error) {
    console.error("deleteBacklog error:", error);
    return res.status(500).json({ error: "Failed to delete backlog item" });
  }
}

module.exports = {
  getBacklogsByUser,
  getBacklogsByBoard,
  createBacklog,
  updateStatus,
  updateAgentOutput,
  updateBacklog,
  deleteBacklog,
};

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

    // IMPORTANT: In your Firestore, agent docs are keyed by doc ID (random string)
    // So agentId should be that doc ID.
    const payload = {
      userId: body.userId ?? body.ownerId,     // allow ownerId fallback
      agentId: body.agentId,                  // must be agent doc id
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: body.status,
      repo: body.repo,

      // Normalize arrays (handles stringified JSON)
      requirements: normalizeArray(body.requirements),
      acceptCrit: normalizeArray(body.acceptCrit),

      // keep if frontend sends it; model defaults to []
      agentProcess: normalizeArray(body.agentProcess),
    };

    // Minimal validation
    if (!payload.userId) {
      return res.status(400).json({ error: "Missing userId (or ownerId) in body" });
    }
    if (!payload.agentId) {
      return res.status(400).json({ error: "Missing agentId in body" });
    }

    const created = await taskModel.createBacklogItem(payload);

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

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateStatus error:", error);
    return res.status(500).json({ error: "Failed to update task status" });
  }
}

module.exports = {
  getBacklogsByUser,
  createBacklog,
  updateStatus,
};

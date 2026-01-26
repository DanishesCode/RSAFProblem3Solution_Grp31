// api.js
// Frontend API helpers for Backlog (Firestore-ready)

// Keep this for same-origin dev/prod (your Express + Vite middleware setup)
const API_BASE_URL = "";

/**
 * Firestore agent document IDs (from your screenshots)
 */
export const AGENT_DOC_IDS = {
  DeepSeek: "PGqJh4Sr5mrFTFkRKAut",  // Previously Claude
  Gemma: "sSmp10vRDvPWvFooKv1t",      // Previously Gemini
  GPT_OSS: "sowDLFwSa5K1ZdyUrgs7",    // Previously OpenAI
  // Keep old keys for backward compatibility with existing Firestore data
  Claude: "PGqJh4Sr5mrFTFkRKAut",
  Gemini: "sSmp10vRDvPWvFooKv1t",
  OpenAI: "sowDLFwSa5K1ZdyUrgs7",
};

/**
 * Backwards compatible mappings (old MSSQL-ish IDs / names)
 */
const AGENT_ALIASES = {
  // numeric / legacy IDs
  "1": AGENT_DOC_IDS.DeepSeek,
  "2": AGENT_DOC_IDS.Gemma,
  "3": AGENT_DOC_IDS.GPT_OSS,

  // new names (various casing)
  "deepseek": AGENT_DOC_IDS.DeepSeek,
  "gemma": AGENT_DOC_IDS.Gemma,
  "gpt_oss": AGENT_DOC_IDS.GPT_OSS,
  "gptoss": AGENT_DOC_IDS.GPT_OSS,
  
  // old names (backward compatibility)
  "claude": AGENT_DOC_IDS.DeepSeek,
  "gemini": AGENT_DOC_IDS.Gemma,
  "openai": AGENT_DOC_IDS.GPT_OSS,
  "openAi": AGENT_DOC_IDS.GPT_OSS,
  "openAI": AGENT_DOC_IDS.GPT_OSS,
};

/**
 * If value is already a Firestore doc id, we should keep it.
 * Firestore doc ids are often long alphanumeric strings.
 */
function looksLikeFirestoreId(value) {
  if (typeof value !== "string") return false;
  // simple heuristic: long enough and alphanumeric-ish
  return value.length >= 15 && /^[A-Za-z0-9_-]+$/.test(value);
}

/**
 * Convert ANY incoming agent representation into a Firestore agent doc id.
 * Supports:
 * - 1/2/3
 * - "DeepSeek"/"Gemma"/"GPT_OSS" (new names)
 * - "Claude"/"Gemini"/"OpenAI" (old names for backward compatibility)
 * - already doc id
 */
function normalizeAgentId(agentId, assignedAgent) {
  // Prefer agentId if provided
  if (agentId !== undefined && agentId !== null && agentId !== "") {
    const raw = String(agentId);

    // Already a Firestore doc ID? keep
    if (looksLikeFirestoreId(raw)) return raw;

    // Map legacy numeric / names
    const keyLower = raw.toLowerCase();
    if (AGENT_ALIASES[raw]) return AGENT_ALIASES[raw];
    if (AGENT_ALIASES[keyLower]) return AGENT_ALIASES[keyLower];

    // Unknown: return raw (still save, but won't join)
    return raw;
  }

  // Fallback: use assignedAgent (name)
  if (assignedAgent !== undefined && assignedAgent !== null && assignedAgent !== "") {
    const raw = String(assignedAgent);
    const keyLower = raw.toLowerCase();
    if (AGENT_ALIASES[raw]) return AGENT_ALIASES[raw];
    if (AGENT_ALIASES[keyLower]) return AGENT_ALIASES[keyLower];
    return raw;
  }

  return "";
}

/**
 * Parse array fields that might come as:
 * - actual arrays
 * - JSON string '["a","b"]'
 * - empty string
 * - plain string -> ["that string"]
 */
function parseArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function normalizeStatus(status) {
  if (!status) return "toDo";
  const s = String(status);

  // Keep your UI strings consistent
  const lower = s.toLowerCase();
  if (lower === "todo") return "toDo";
  if (lower === "inprogress") return "inProgress";
  if (lower === "review") return "review";
  if (lower === "done") return "done";
  if (lower === "cancelled" || lower === "canceled") return "cancelled";

  return s;
}

/**
 * Normalize acceptance criteria field name:
 * frontend might use acceptanceCriteria
 * backend expects acceptCrit
 */
function normalizeAcceptCrit(body) {
  return (
    body.acceptCrit ??
    body.acceptanceCrit ??
    body.acceptanceCriteria ??
    body.acceptCriteria ??
    []
  );
}

// ---------------- API CALLS ----------------

/**
 * GET /backlog/getUserLogs?userId=...
 */
export async function initializeLogs(userId, boardId = null) {
  try {
    let url;
    if (boardId) {
      url = `${API_BASE_URL}/backlog/getBoardLogs?boardId=${encodeURIComponent(boardId)}`;
    } else {
      url = `${API_BASE_URL}/backlog/getUserLogs?userId=${encodeURIComponent(userId)}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to fetch logs: ${res.status} ${text}`);
    }

    const logs = await res.json();

    return (logs || []).map((log) => {
      // Convert requirement string back to array
      let requirements = [];
      if (log.requirement) {
        requirements = log.requirement.split(", ").filter(r => r.trim() !== "");
      } else if (Array.isArray(log.requirements)) {
        requirements = log.requirements;
      }

      return {
        taskid: log.taskId || log.taskid,
        title: log.title || "",
        prompt: log.prompt || "",
        description: log.description || "",
        priority: log.priority || "medium",
        status: normalizeStatus(log.status || "toDo"),
        repo: log.repo || "",
        ownerId: log.ownerId || "",
        boardId: log.boardId || "",
        agentName: log.agentName || "",
        agentOutput: log.agentOutput || "",
        assignedAgent: log.agentName || log.assignedAgent || "",
        requirements: requirements,
        progress: 0,
      };
    });
  } catch (error) {
    console.error("initializeLogs error:", error);
    return [];
  }
}

/**
 * POST /backlog/save
 * You can pass either:
 * - agentId: 1/2/3  (legacy)
 * - assignedAgent: "Gemma" (or legacy "Gemini")
 * - agentId: "sSmp10vRDvPWvFooKv1t" (Firestore doc id)
 *
 * This function will convert to the Firestore doc id automatically.
 */
export async function saveBacklog(formData) {
  const acceptCritRaw = normalizeAcceptCrit(formData);

  // Normalize agent id using BOTH agentId and assignedAgent
  const normalizedAgentId = normalizeAgentId(formData.agentId, formData.assignedAgent);

  const payload = {
    // Core fields
    title: formData.title || "",
    prompt: formData.prompt || "",
    description: formData.description || "", // Optional field
    priority: formData.priority || "medium",
    status: normalizeStatus(formData.status || "toDo"),
    repo: formData.repo || "",
    
    // User and board fields
    ownerId: String(formData.ownerId ?? formData.userId ?? ""),
    boardId: formData.boardId || "",
    
    // Agent fields
    agentName: formData.assignedAgent || "",
    agentOutput: formData.agentOutput || "",
    
    // Requirements (will be converted to string in model)
    requirements: parseArray(formData.requirements),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/backlog/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to save backlog: ${res.status} ${text}`);
    }

    const created = await res.json();

    // Convert requirement string back to array for frontend
    let requirements = [];
    if (created.requirement) {
      requirements = created.requirement.split(", ").filter(r => r.trim() !== "");
    } else if (Array.isArray(created.requirements)) {
      requirements = created.requirements;
    }

    return {
      taskid: created.taskId || created.taskid,

      title: created.title || "",
      prompt: created.prompt || "",
      description: created.description || "",
      priority: created.priority || "medium",
      status: normalizeStatus(created.status || "toDo"),
      repo: created.repo || "",

      ownerId: created.ownerId || formData.ownerId || formData.userId || "",
      boardId: created.boardId || formData.boardId || "",
      
      agentName: created.agentName || "",
      agentOutput: created.agentOutput || "",
      assignedAgent: created.agentName || "",

      requirements: requirements,
      progress: 0,
    };
  } catch (error) {
    console.error("saveBacklog error:", error);
    throw error;
  }
}

/**
 * PUT /backlog/status-update
 * body: { taskId, status }
 */
export async function updateTaskStatus(taskId, status) {
  const payload = {
    taskId: String(taskId),
    status: normalizeStatus(status),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/backlog/status-update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to update status: ${res.status} ${text}`);
    }

    const updated = await res.json();

    return {
      taskid: updated.taskId || updated.taskid,

      title: updated.title || "",
      description: updated.description || "",
      priority: updated.priority || "medium",
      status: normalizeStatus(updated.status || "toDo"),
      repo: updated.repo || "",

      agentId: updated.agentId || "",
      agentName: updated.agentName || "",
      assignedAgent: updated.agentName || "",

      requirements: parseArray(updated.requirements),
      acceptCrit: parseArray(updated.acceptCrit),

      progress: 0,
      agentProcess: updated.agentProcess || [],
    };
  } catch (error) {
    console.error("updateTaskStatus error:", error);
    throw error;
  }
}

/**
 * PUT /backlog/update
 * body: { taskId, title, prompt, description, priority, status, repo, ownerId, boardId, agentName, agentOutput, requirements }
 */
export async function updateBacklog(formData) {
  const payload = {
    taskId: String(formData.taskid || formData.taskId || ""),
    // Core fields
    title: formData.title || "",
    prompt: formData.prompt || "",
    description: formData.description || "",
    priority: formData.priority || "medium",
    status: normalizeStatus(formData.status || "toDo"),
    repo: formData.repo || "",
    
    // User and board fields
    ownerId: String(formData.ownerId ?? formData.userId ?? ""),
    boardId: formData.boardId || "",
    
    // Agent fields
    agentName: formData.assignedAgent || formData.agentName || "",
    agentOutput: formData.agentOutput || "",
    
    // Requirements (will be converted to string in model)
    requirements: parseArray(formData.requirements),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/backlog/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to update backlog: ${res.status} ${text}`);
    }

    const updated = await res.json();

    // Convert requirement string back to array for frontend
    let requirements = [];
    if (updated.requirement) {
      requirements = updated.requirement.split(", ").filter(r => r.trim() !== "");
    } else if (Array.isArray(updated.requirements)) {
      requirements = updated.requirements;
    }

    return {
      taskid: updated.taskId || updated.taskid,

      title: updated.title || "",
      prompt: updated.prompt || "",
      description: updated.description || "",
      priority: updated.priority || "medium",
      status: normalizeStatus(updated.status || "toDo"),
      repo: updated.repo || "",

      ownerId: updated.ownerId || formData.ownerId || formData.userId || "",
      boardId: updated.boardId || formData.boardId || "",
      
      agentName: updated.agentName || "",
      agentOutput: updated.agentOutput || "",
      assignedAgent: updated.agentName || "",

      requirements: requirements,
      progress: 0,
    };
  } catch (error) {
    console.error("updateBacklog error:", error);
    throw error;
  }
}

/**
 * DELETE /backlog/delete
 * body: { taskId }
 */
export async function deleteBacklog(taskId) {
  const payload = {
    taskId: String(taskId),
  };

  try {
    const res = await fetch(`${API_BASE_URL}/backlog/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to delete backlog: ${res.status} ${text}`);
    }

    return await res.json();
  } catch (error) {
    console.error("deleteBacklog error:", error);
    throw error;
  }
}

/**
 * Optional helper if your UI needs agent list without calling backend.
 * (This uses your Firestore IDs directly.)
 */
export function getStaticAgents() {
  return [
    { id: AGENT_DOC_IDS.DeepSeek, agentName: "DeepSeek", agentSpecial: "frontend" },
    { id: AGENT_DOC_IDS.Gemma, agentName: "Gemma", agentSpecial: "backend" },
    { id: AGENT_DOC_IDS.GPT_OSS, agentName: "GPT_OSS", agentSpecial: "ui-ux" },
  ];
}

// ---------------- BOARD CHAT (collab boards only) ----------------

export async function listBoardMessages(boardId, userId, limit = 50) {
  const url = `${API_BASE_URL}/boards/${encodeURIComponent(boardId)}/chat/messages?userId=${encodeURIComponent(
    userId
  )}&limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to list chat messages: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.messages || [];
}

export async function sendBoardMessage(boardId, userId, text) {
  const url = `${API_BASE_URL}/boards/${encodeURIComponent(boardId)}/chat/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ boardId, userId, text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to send chat message: ${res.status} ${msg}`);
  }

  return await res.json();
}

export async function getBoardChatUnread(boardId, userId) {
  const url = `${API_BASE_URL}/boards/${encodeURIComponent(boardId)}/chat/unread?userId=${encodeURIComponent(
    userId
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to get chat unread: ${res.status} ${msg}`);
  }

  return await res.json();
}

export async function markBoardChatRead(boardId, userId) {
  const url = `${API_BASE_URL}/boards/${encodeURIComponent(boardId)}/chat/read`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ boardId, userId }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to mark chat read: ${res.status} ${msg}`);
  }

  return await res.json();
}

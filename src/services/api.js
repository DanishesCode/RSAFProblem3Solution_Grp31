// api.js
// Frontend API helpers for Backlog (Firestore-ready)

// Keep this for same-origin dev/prod (your Express + Vite middleware setup)
const API_BASE_URL = "";

/**
 * Firestore agent document IDs (from your screenshots)
 */
export const AGENT_DOC_IDS = {
  Claude: "PGqJh4Sr5mrFTFkRKAut",
  Gemini: "sSmp10vRDvPWvFooKv1t",
  OpenAI: "sowDLFwSa5K1ZdyUrgs7",
};

/**
 * Backwards compatible mappings (old MSSQL-ish IDs / names)
 */
const AGENT_ALIASES = {
  // numeric / legacy IDs
  "1": AGENT_DOC_IDS.Claude,
  "2": AGENT_DOC_IDS.Gemini,
  "3": AGENT_DOC_IDS.OpenAI,

  // names (various casing)
  "claude": AGENT_DOC_IDS.Claude,
  "gemini": AGENT_DOC_IDS.Gemini,
  "openai": AGENT_DOC_IDS.OpenAI,
  "openAi": AGENT_DOC_IDS.OpenAI,
  "openAI": AGENT_DOC_IDS.OpenAI,
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
 * - "Claude"/"Gemini"/"OpenAI"
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
export async function initializeLogs(userId) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/backlog/getUserLogs?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to fetch logs: ${res.status} ${text}`);
    }

    const logs = await res.json();

    return (logs || []).map((log) => ({
      taskid: log.taskId || log.taskid,

      title: log.title || "",
      description: log.description || "",
      priority: log.priority || "medium",
      status: normalizeStatus(log.status || "toDo"),
      repo: log.repo || "",

      // agentId should now be Firestore doc id
      agentId: log.agentId || "",

      // backend join will populate these if agentId matches doc id
      agentName: log.agentName || "",
      assignedAgent: log.agentName || log.assignedAgent || "",

      requirements: parseArray(log.requirements),
      acceptCrit: parseArray(log.acceptCrit),

      progress: 0,
      agentProcess: log.agentProcess || [],
    }));
  } catch (error) {
    console.error("initializeLogs error:", error);
    return [];
  }
}

/**
 * POST /backlog/save
 * You can pass either:
 * - agentId: 1/2/3  (legacy)
 * - assignedAgent: "Gemini" (legacy)
 * - agentId: "sSmp10vRDvPWvFooKv1t" (Firestore doc id)
 *
 * This function will convert to the Firestore doc id automatically.
 */
export async function saveBacklog(formData) {
  const acceptCritRaw = normalizeAcceptCrit(formData);

  // Normalize agent id using BOTH agentId and assignedAgent
  const normalizedAgentId = normalizeAgentId(formData.agentId, formData.assignedAgent);

  const payload = {
    // required-ish
    userId: String(formData.userId ?? formData.ownerId ?? ""), // allow ownerId fallback
    agentId: normalizedAgentId,

    // core fields
    title: formData.title || "",
    description: formData.description || "",
    priority: formData.priority || "medium",
    status: normalizeStatus(formData.status || "toDo"),
    repo: formData.repo || "",

    // arrays
    requirements: parseArray(formData.requirements),
    acceptCrit: parseArray(acceptCritRaw),

    // optional
    agentProcess: parseArray(formData.agentProcess),
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

    return {
      taskid: created.taskId || created.taskid,

      title: created.title || "",
      description: created.description || "",
      priority: created.priority || "medium",
      status: normalizeStatus(created.status || "toDo"),
      repo: created.repo || "",

      agentId: created.agentId || "",
      agentName: created.agentName || "",
      assignedAgent: created.agentName || "",

      requirements: parseArray(created.requirements),
      acceptCrit: parseArray(created.acceptCrit),

      progress: 0,
      agentProcess: created.agentProcess || [],
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
 * Optional helper if your UI needs agent list without calling backend.
 * (This uses your Firestore IDs directly.)
 */
export function getStaticAgents() {
  return [
    { id: AGENT_DOC_IDS.Claude, agentName: "Claude", agentSpecial: "backend" },
    { id: AGENT_DOC_IDS.Gemini, agentName: "Gemini", agentSpecial: "frontend" },
    { id: AGENT_DOC_IDS.OpenAI, agentName: "OpenAI", agentSpecial: "ui-ux" },
  ];
}

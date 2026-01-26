// tasks.js
// Handles loading logs, adding tasks to UI, mapping agents, saving to backend (unchanged)

import {
    apiBaseUrl,
    taskTemplate,
    columns
} from "./domRefs.js";

import { pushActivity } from "./activity.js";

/* ======================================================
    MAP AGENT ID → NAME
======================================================= */
export function mapAgentIdToName(id) {
    switch (String(id)) {
        case "1": return "DeepSeek";
        case "2": return "Gemma";
        case "3": return "GPT_OSS";
        default: return "Unknown";
    }
}

/* ======================================================
    SAVE TASK TO BACKEND
======================================================= */
export async function saveBacklog(formData) {
    try {
        const response = await fetch(`${apiBaseUrl}/backlog/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        return await response.json();
    } catch (err) {
        console.error("Error saving:", err);
    }
}

/* ======================================================
    LOAD USER LOGS
======================================================= */
export async function initializeLogs() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
        const logs = await fetch(`/backlog/getUserLogs?userId=${userId}`)
            .then(res => res.json());

        logs.forEach(data => addTask(data));

        if (typeof updateAgentWorkload === "function") {
            updateAgentWorkload();
        }
    } catch (err) {
        console.error("Error loading logs:", err);
    }
}

/* ======================================================
    NORMALIZE ARRAYS FROM DB
======================================================= */
function normalizeArray(raw) {
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;

            // If JSON is a string containing JSON
            if (typeof parsed === "string") {
                try {
                    const parsed2 = JSON.parse(parsed);
                    if (Array.isArray(parsed2)) return parsed2;
                } catch {}
                return [parsed];
            }

        } catch {
            if (raw.trim() !== "") return [raw.trim()];
        }
    }

    return [];
}

/* ======================================================
    ADD TASK TO UI
======================================================= */
export function addTask(taskData) {
    const clone = taskTemplate.cloneNode(true);
    clone.style.display = "block";

    // Normalize requirements & acceptance criteria
    const requirements = normalizeArray(taskData.requirements);
    const acceptCrit = normalizeArray(taskData.acceptanceCriteria);

    // Determine agent name
    const agentId = taskData.agentId || taskData.agentid || "";
    const agentName = taskData.assignedAgent || mapAgentIdToName(agentId);

    // Set attributes
    clone.setAttribute("taskid", taskData.taskid || `task-${Date.now()}`);
    clone.setAttribute("status", taskData.status || "toDo");
    clone.setAttribute("title", taskData.title || "");
    clone.setAttribute("priority", taskData.priority || "");
    clone.setAttribute("repo", taskData.repo || "");
    clone.setAttribute("agentId", agentId);
    clone.setAttribute("assignedAgent", agentName);
    clone.setAttribute("description", taskData.description || "");

    clone.setAttribute("requirements", JSON.stringify(requirements));
    clone.setAttribute("acceptCrit", JSON.stringify(acceptCrit));

    // Fill UI fields
    clone.querySelector(".task-title").textContent = taskData.title || "";
    clone.querySelector(".task-priority").textContent = taskData.priority || "";
    clone.querySelector(".repoSelected").textContent = `Repo: ${taskData.repo || ""}`;
    clone.querySelector(".agentSelected").textContent = `Agent: ${agentName}`;

    // Append to correct column
    const column = document.querySelector(`.column[type="${taskData.status || "toDo"}"] .task-list`);
    if (column) column.appendChild(clone);

    // Re-attach drag listeners if available
    if (typeof attachDragListeners === "function") {
        attachDragListeners();
    }

    // Clicking a task => open edit modal (only in To Do)
    clone.addEventListener("click", (e) => {
        if (e.target.closest(".task-control")) return;

        const status = clone.getAttribute("status");
        if (status !== "toDo") return;

        if (window.openEditModal) {
            openEditModal(clone);
        }
    });

    // Activity log entry
    pushActivity({
        title: taskData.title,
        agent: agentName,
        status: "Created",
        priority: taskData.priority,
        repo: taskData.repo,
        percent: 0
    });
}

// activity.js
// Handles the Activity Sidebar + pushActivity()

import {
    activityBtn,
    sidebar,
    sidebarClose,
    activityContent
} from "./domRefs.js";

/* ======================================================
   SIDEBAR — ACTIVITY
======================================================= */
export function initActivitySidebar() {
    activityBtn?.addEventListener("click", () => {
        sidebar.classList.add("open");
    });

    sidebarClose?.addEventListener("click", () => {
        sidebar.classList.remove("open");
    });
}

/* ======================================================
   PUSH ACTIVITY ENTRY
======================================================= */
export function pushActivity({ title, agent, status, priority, repo, percent }) {
    const entry = document.createElement("div");
    entry.className = "activity-entry";

    entry.innerHTML = `
        <div class="activity-entry-title">${title}</div>
        <small>Status: <b>${status}</b></small><br>
        <small>Agent: ${agent}</small><br>
        <small>Priority: ${priority}</small><br>
        <small>Repo: ${repo}</small><br>
        <small>Progress: ${percent}%</small>
    `;

    activityContent.prepend(entry);
}

// Allow dragAndDrop.js to call pushActivity
window.pushActivity = pushActivity;

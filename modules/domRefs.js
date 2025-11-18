// domRefs.js
// All DOM queries & constants from script.js, exported for other modules.

export const apiBaseUrl = "http://localhost:3000";

/* -------------------------
   DOM ELEMENTS
--------------------------*/
export const newBtn = document.querySelector(".btn-new");
export const activityBtn = document.querySelector(".btn-activity");
export const modalPanel = document.querySelector("#addNewTaskPanel");
export const modal = document.getElementById("addNewTaskPanel");

export const modalTitle =
    modal.querySelector(".modal-title") ||
    modal.querySelector(".panel-title") ||
    modal.querySelector("h2");

export const closeBtn = modal.querySelector(".close-btn");
export const createBtn = modal.querySelector(".create");
export const cancelBtn = modal.querySelector(".cancel");

export const sidebar = document.getElementById("activity-sidebar");
export const sidebarClose = document.getElementById("close-activity");
export const activityContent = document.getElementById("activity-content");

export const titleInput = modal.querySelector('input[type="text"]');
export const descriptionInput = modal.querySelector("textarea");
export const prioritySelect = modal.querySelector("select");

export const tags = Array.from(modal.querySelectorAll(".tags span"));
export const agentCards = Array.from(modal.querySelectorAll(".agent-card"));

export let requirementContainer = modal.querySelector("#requirements-container");
export let acceptanceContainer = modal.querySelector("#acceptance-container");

// Fallback for weird structures
if (!requirementContainer || !acceptanceContainer) {
    const labels = Array.from(modal.querySelectorAll("label"));
    const reqLabel = labels.find(l => l.textContent.includes("Requirements"));
    const accLabel = labels.find(l => l.textContent.includes("Acceptance"));
    if (reqLabel) requirementContainer = reqLabel.nextElementSibling;
    if (accLabel) acceptanceContainer = accLabel.nextElementSibling;
}

export const githubProjectsContainer = modal.querySelector(".github-projects");

/* repos from localStorage */
export const repos = (localStorage.getItem("repos") || "").split(",").filter(Boolean);

/* Task template */
export const taskTemplate = document.querySelector(".task");

/* Search bar */
export const searchBar = document.querySelector(".search-bar input");

/* Filter panel elements */
export const filterBtn = document.getElementById("open-filter");
export const filterPanel = document.getElementById("filterPanel");
export const filterClose = document.getElementById("close-filter");
export const clearFiltersBtn = document.getElementById("clear-filters");
export const filterReposContainer = document.getElementById("filter-repos");
export const filterAgentsContainer = document.getElementById("filter-agents");

/* Dashboard button */
export const dashboardBtn = document.getElementById("open-dashboard");

/* columns */
export const columns = document.querySelectorAll(".column");

/* Storage for dynamic repo cards */
export let repoCards = [];
export function setRepoCards(arr) {
    repoCards = arr;
}

/* Export a function to update requirement container variables if needed */
export function updateContainers(req, acc) {
    requirementContainer = req;
    acceptanceContainer = acc;
}

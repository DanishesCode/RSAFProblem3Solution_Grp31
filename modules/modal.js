// modal.js
// All modal create/edit logic extracted from script.js (unchanged)

import {
    modalPanel,
    modal,
    modalTitle,
    closeBtn,
    createBtn,
    cancelBtn,
    titleInput,
    descriptionInput,
    prioritySelect,
    tags,
    agentCards,
    requirementContainer,
    acceptanceContainer,
    githubProjectsContainer,
    repos,
    setRepoCards,
    repoCards
} from "./domRefs.js";

import { notify } from "./notify.js";
import { addTask } from "./tasks.js";
import { saveBacklog } from "./tasks.js";

/* ======================================================
   RESET MODAL
======================================================= */
export function resetModal() {
    titleInput.value = "";
    descriptionInput.value = "";
    prioritySelect.value = "medium";

    tags.forEach(t => t.classList.remove("selected"));
    agentCards.forEach(a => a.classList.remove("selected"));

    // Clear containers
    requirementContainer.innerHTML = "";
    acceptanceContainer.innerHTML = "";

    // Add single empty row
    addInput(requirementContainer);
    addInput(acceptanceContainer);

    // Clear repo cards selection
    repoCards.forEach(r => r.classList.remove("selected"));
}

/* ======================================================
   OPEN MODAL (NEW TASK)
======================================================= */
export function openNewTaskModal() {
    resetModal();
    loadReposIntoModal();
    modalPanel.style.display = "block";

    editingTaskElement = null;
    createBtn.textContent = "Create Task";
    createBtn.classList.remove("save");
    createBtn.classList.add("create");
    if (modalTitle) modalTitle.textContent = "Create Task";
}

/* ======================================================
   CLOSE MODAL
======================================================= */
export function closeModal() {
    modalPanel.style.display = "none";
    editingTaskElement = null;
    createBtn.textContent = "Create Task";
    createBtn.classList.remove("save");
    createBtn.classList.add("create");
    resetModal();
}

/* ======================================================
   ADD INPUT ROW (+ button)
======================================================= */
export function addInput(container) {
    const row = document.createElement("div");
    row.className = "add-row";

    row.innerHTML = `
        <input type="text" value="" />
        <button class="add-btn">+</button>
    `;

    row.querySelector(".add-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        addInput(container);
    });

    container.appendChild(row);
    return row;
}

/* ======================================================
   LOAD REPOS INTO MODAL
======================================================= */
export function loadReposIntoModal() {
    githubProjectsContainer.innerHTML = "";

    repos.forEach(repoName => {
        const card = document.createElement("div");
        card.classList.add("repo-card");
        card.innerHTML = `<strong value="${repoName.trim()}">${repoName.trim()}</strong>`;

        card.addEventListener("click", () => {
            repoCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
        });

        githubProjectsContainer.appendChild(card);
    });

    setRepoCards(Array.from(githubProjectsContainer.querySelectorAll(".repo-card")));
}

/* ======================================================
   COLLECT MODAL VALUES
======================================================= */
export function collectValues() {
    const selectedRepoCard = modal.querySelector(".repo-card.selected strong");
    const selectedAgent = agentCards.find(card => card.classList.contains("selected"));

    return {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        priority: prioritySelect.value,

        requirements: [...requirementContainer.querySelectorAll("input")]
            .map(i => i.value.trim())
            .filter(Boolean),

        acceptanceCriteria: [...acceptanceContainer.querySelectorAll("input")]
            .map(i => i.value.trim())
            .filter(Boolean),

        assignedAgent: selectedAgent?.getAttribute("value") || null,
        agentId: selectedAgent?.getAttribute("agentId") || null,

        repo: selectedRepoCard ? selectedRepoCard.getAttribute("value") : null,
        status: "toDo"
    };
}

/* ======================================================
   VALIDATION
======================================================= */
export function validateForm() {
    const v = collectValues();
    const missing = [];

    if (!v.title) missing.push("Task Title");
    if (!v.description) missing.push("Description");
    if (!v.assignedAgent) missing.push("Assigned Agent");
    if (!v.repo) missing.push("GitHub Project");
    if (v.requirements.length === 0) missing.push("Requirements");
    if (v.acceptanceCriteria.length === 0) missing.push("Acceptance Criteria");

    if (missing.length > 0) {
        notify("Missing fields:\n- " + missing.join("\n- "), 3500, "error");
        return false;
    }
    return true;
}

/* ======================================================
   CREATE OR SAVE TASK
======================================================= */

let editingTaskElement = null;

export function initCreateOrEdit() {
    createBtn.addEventListener("click", async () => {

        // UPDATE EXISTING TASK
        if (editingTaskElement) {
            if (!validateForm()) return;

            const values = collectValues();

            editingTaskElement.setAttribute("title", values.title);
            editingTaskElement.setAttribute("description", values.description || "");
            editingTaskElement.setAttribute("priority", values.priority);
            editingTaskElement.setAttribute("assignedAgent", values.assignedAgent || "");
            editingTaskElement.setAttribute("repo", values.repo || "");

            editingTaskElement.setAttribute("requirements", JSON.stringify(values.requirements));
            editingTaskElement.setAttribute("acceptCrit", JSON.stringify(values.acceptanceCriteria));

            editingTaskElement.querySelector(".task-title").textContent = values.title;
            editingTaskElement.querySelector(".task-priority").textContent = values.priority;
            editingTaskElement.querySelector(".repoSelected").textContent = `Repo: ${values.repo || ""}`;
            editingTaskElement.querySelector(".agentSelected").textContent = `Agent: ${values.assignedAgent || ""}`;

            closeModal();
            return;
        }

        // CREATE NEW TASK
        if (!validateForm()) return;

        const formData = collectValues();
        formData.userId = localStorage.getItem("userId");

        const saved = await saveBacklog(formData);
        if (saved) addTask(saved);

        closeModal();
    });
}

/* ======================================================
   OPEN EDIT MODAL
======================================================= */
export function openEditModal(taskEl) {
    if (!taskEl || taskEl.getAttribute("taskid") === "TEMPLATE") return;

    editingTaskElement = taskEl;

    titleInput.value =
        taskEl.getAttribute("title") ||
        taskEl.querySelector(".task-title")?.textContent ||
        "";

    descriptionInput.value = taskEl.getAttribute("description") || "";
    prioritySelect.value = taskEl.getAttribute("priority") || "medium";

    /* ------- Prefill Requirements ------- */
    fillArrayInputs(requirementContainer, taskEl.getAttribute("requirements"));

    /* ------- Prefill Acceptance Criteria ------- */
    fillArrayInputs(acceptanceContainer, taskEl.getAttribute("acceptCrit"));

    /* ------- Prefill agent selection ------- */
    const assigned = taskEl.getAttribute("assignedAgent") || "";
    agentCards.forEach(c =>
        c.classList.toggle("selected", c.getAttribute("value") === assigned)
    );

    /* ------- Prefill repo selection ------- */
    loadReposIntoModal();

    const repoVal = taskEl.getAttribute("repo") || "";
    repoCards.forEach(r => {
        const v = r.querySelector("strong")?.getAttribute("value") || "";
        r.classList.toggle("selected", v === repoVal);
    });

    /* ------- Switch to EDIT mode ------- */
    modalPanel.style.display = "block";
    createBtn.textContent = "Save";
    createBtn.classList.add("save");
    createBtn.classList.remove("create");
    if (modalTitle) modalTitle.textContent = "Edit Task";
}

/* ======================================================
   UTILITY: Prefill Requirements / Acceptance Arrays
======================================================= */
function fillArrayInputs(container, raw) {
    let arr = [];

    try {
        if (raw) {
            const parsedOnce = JSON.parse(raw);
            if (Array.isArray(parsedOnce)) arr = parsedOnce;
            else if (typeof parsedOnce === "string") {
                try {
                    const parsedTwice = JSON.parse(parsedOnce);
                    if (Array.isArray(parsedTwice)) arr = parsedTwice;
                    else arr = [parsedOnce];
                } catch { arr = [parsedOnce]; }
            }
        }
    } catch {
        if (raw?.trim()) arr = [raw.trim()];
    }

    container.innerHTML = "";
    if (arr.length === 0) {
        addInput(container);
    } else {
        arr.forEach(val => {
            const row = document.createElement("div");
            row.className = "add-row";
            row.innerHTML = `
                <input type="text" value="${(val + "").replace(/"/g, "&quot;")}" />
                <button class="add-btn">+</button>
            `;
            row.querySelector(".add-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                addInput(container);
            });
            container.appendChild(row);
        });
    }
}

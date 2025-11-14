/* ------------------------------------------------------
   DRAG & DROP + PROGRESS + ACTIVITY LOGGING
------------------------------------------------------ */

/* -------------- BACKEND UPDATE -------------- */
async function updateTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch("/backlog/status-update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, status: newStatus })
        });

        if (!response.ok) {
            console.error("Backend update failed");
        }
    } catch (err) {
        console.error("Status update error:", err);
    }
}

/* -------------- VALID TRANSITIONS -------------- */
function isValidTransition(from, to) {
    const rules = {
        toDo: ["progress", "cancel"],
        progress: ["toDo", "cancel"],
        review: ["done", "cancel"],
        done: ["cancel"],
        cancel: ["toDo"]
    };
    return rules[from]?.includes(to);
}

/* -------------- PROGRESS MANAGEMENT -------------- */

const progressTimers = new Map();

function showProgress(task) {
    const bar = task.querySelector(".progress");
    if (bar) bar.style.display = "block";
}

function hideProgress(task) {
    const bar = task.querySelector(".progress");
    if (bar) bar.style.display = "none";
}

function setProgress(task, percent) {
    const fill = task.querySelector(".progress-fill");
    if (fill) fill.style.width = percent + "%";
}

function handleProgressChange(task, newStatus) {
    const id = task.getAttribute("taskid");

    // Stop old timer
    if (progressTimers.has(id)) {
        clearTimeout(progressTimers.get(id));
        progressTimers.delete(id);
    }

    switch (newStatus) {
        case "progress":
            showProgress(task);

            // If already has previous % retain it
            const prevWidth = parseInt(
                task.querySelector(".progress-fill").style.width || "0"
            );

            const newPercent = prevWidth > 0 ? prevWidth : 67;
            setProgress(task, newPercent);

            // Start countdown to auto-move → Review
            const timer = setTimeout(() => {
                moveTaskToColumn(task, "review");
            }, 10000);

            progressTimers.set(id, timer);

            // Log
            window.pushActivity?.({
                title: task.getAttribute("title"),
                agent: task.getAttribute("assignedAgent"),
                status: "In Progress",
                priority: task.getAttribute("priority"),
                repo: task.getAttribute("repo"),
                percent: newPercent
            });
            break;

        case "review":
        case "done":
            showProgress(task);
            setProgress(task, 100);

            // Log
            window.pushActivity?.({
                title: task.getAttribute("title"),
                agent: task.getAttribute("assignedAgent"),
                status: newStatus,
                priority: task.getAttribute("priority"),
                repo: task.getAttribute("repo"),
                percent: 100
            });
            break;

        case "cancel":
            hideProgress(task);

            window.pushActivity?.({
                title: task.getAttribute("title"),
                agent: task.getAttribute("assignedAgent"),
                status: "Cancelled",
                priority: task.getAttribute("priority"),
                repo: task.getAttribute("repo"),
                percent: 0
            });
            break;

        case "toDo":
            showProgress(task); // keep whatever % it had (retains state)

            const retained = parseInt(
                task.querySelector(".progress-fill").style.width || "0"
            );

            window.pushActivity?.({
                title: task.getAttribute("title"),
                agent: task.getAttribute("assignedAgent"),
                status: "To Do",
                priority: task.getAttribute("priority"),
                repo: task.getAttribute("repo"),
                percent: retained
            });
            break;
    }
}

/* Auto-Move Helper */
function moveTaskToColumn(task, newStatus) {
    const id = task.getAttribute("taskid");
    const list = document.querySelector(`.column[type="${newStatus}"] .task-list`);
    if (!list) return;

    list.appendChild(task);
    task.setAttribute("status", newStatus);

    updateTaskStatus(id, newStatus);
    handleProgressChange(task, newStatus);
}

/* -------------- DRAG EVENTS -------------- */

function drag(ev) {
    ev.dataTransfer.setData("text/plain", ev.target.getAttribute("taskid"));
    setTimeout(() => ev.target.classList.add("dragging"), 0);
}

function allowDrop(ev) {
    ev.preventDefault();
}

function dragEnter(ev) {
    const col = ev.target.closest(".column");
    if (col) col.classList.add("drag-over");
}

function dragLeave(ev) {
    const col = ev.target.closest(".column");
    if (col) col.classList.remove("drag-over");
}

function drop(ev) {
    ev.preventDefault();

    const id = ev.dataTransfer.getData("text/plain");
    const task = document.querySelector(`.task[taskid="${id}"]`);
    if (!task) return;

    task.classList.remove("dragging");

    const col = ev.target.closest(".column");
    if (!col) return;

    col.classList.remove("drag-over");

    const newStatus = col.getAttribute("type");
    const oldStatus = task.getAttribute("status");

    if (!isValidTransition(oldStatus, newStatus)) {
        console.warn(`❌ INVALID MOVE: ${oldStatus} → ${newStatus}`);
        return;
    }

    const list = col.querySelector(".task-list");
    list.appendChild(task);

    task.setAttribute("status", newStatus);

    updateTaskStatus(id, newStatus);
    handleProgressChange(task, newStatus);
}

/* -------------- INIT -------------- */
function attachDragListeners() {
    document.querySelectorAll('.task[draggable="true"]').forEach(task => {
        task.removeEventListener("dragstart", drag);
        task.addEventListener("dragstart", drag);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    attachDragListeners();

    document.querySelectorAll(".column").forEach(col => {
        col.addEventListener("dragover", allowDrop);
        col.addEventListener("drop", drop);
        col.addEventListener("dragenter", dragEnter);
        col.addEventListener("dragleave", dragLeave);
    });
});

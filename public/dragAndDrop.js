// --- Drag and Drop Logic Functions ---

function drag(ev) {
    // Store task ID being dragged
    ev.dataTransfer.setData("text/plain", ev.target.getAttribute("taskid"));

    // Add dragging class (for visual feedback)
    setTimeout(() => ev.target.classList.add("dragging"), 0);
}

function allowDrop(ev) {
    // Must prevent default to allow dropping
    ev.preventDefault();
}

function dragEnter(ev) {
    const dropColumn = ev.target.closest(".column");
    if (dropColumn) {
        dropColumn.classList.add("drag-over");
    }
}

function dragLeave(ev) {
    const dropColumn = ev.target.closest(".column");
    if (dropColumn) {
        dropColumn.classList.remove("drag-over");
    }
}

function drop(ev) {
    ev.preventDefault();

    const taskId = ev.dataTransfer.getData("text/plain");
    const draggedTask = document.querySelector(`.task[taskid="${taskId}"]`);

    if (!draggedTask) return;

    draggedTask.classList.remove("dragging");

    const dropColumn = ev.target.closest(".column");
    if (!dropColumn) return;

    dropColumn.classList.remove("drag-over");

    // ✅ Ensure we append into the correct `.task-list`
    const taskList = dropColumn.querySelector(".task-list");
    if (taskList) {
        taskList.appendChild(draggedTask);
        const newStatus = dropColumn.getAttribute("type");
        draggedTask.setAttribute("status", newStatus);
        console.log(`✅ Task ${taskId} moved to ${newStatus}`);
    } else {
        console.error("⚠️ No .task-list found inside column!");
    }
}

// --- Helper: Attach listeners to all tasks ---
function attachDragListeners() {
    document.querySelectorAll('.task[draggable="true"]').forEach(task => {
        task.removeEventListener("dragstart", drag);
        task.addEventListener("dragstart", drag);
    });
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("dragAndDrop.js is running and attaching listeners (Final Version).");

    attachDragListeners();

    // ✅ Attach handlers to all columns and their .task-list children
    document.querySelectorAll(".column, .task-list").forEach(dropZone => {
        dropZone.addEventListener("dragover", allowDrop);
        dropZone.addEventListener("drop", drop);
        dropZone.addEventListener("dragenter", dragEnter);
        dropZone.addEventListener("dragleave", dragLeave);
    });
});

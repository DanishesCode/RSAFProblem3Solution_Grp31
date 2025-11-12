// --- Backend Call Helper Function ---
async function updateTaskStatus(taskId, newStatus) {
  try {
    const response = await fetch("/backlog/status-update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: taskId, status: newStatus }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend Update Failed: ${errorText}`);
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log("Task status updated successfully on server:", data);
  } catch (error) {
    console.error("Error updating status:", error);
  }
}

// Keep timers for in-progress tasks so we can cancel if moved away
const progressTimers = new Map();

function drag(ev) {
  ev.dataTransfer.setData("text/plain", ev.target.getAttribute("taskid"));
  setTimeout(() => ev.target.classList.add("dragging"), 0);
}

function allowDrop(ev) {
  ev.preventDefault();
}

function dragEnter(ev) {
  const dropColumn = ev.target.closest(".column");
  if (dropColumn) dropColumn.classList.add("drag-over");
}

function dragLeave(ev) {
  const dropColumn = ev.target.closest(".column");
  if (dropColumn) dropColumn.classList.remove("drag-over");
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

  const taskList = dropColumn.querySelector(".task-list");
  if (!taskList) {
    console.error("⚠️ No .task-list found inside column!");
    return;
  }

  const newStatus = dropColumn.getAttribute("type");
  taskList.appendChild(draggedTask);
  draggedTask.setAttribute("status", newStatus);

  console.log(`Front-end moved Task ${taskId} to ${newStatus}. Calling backend...`);
  updateTaskStatus(taskId, newStatus);

  handleProgressChange(draggedTask, newStatus);
}

function handleProgressChange(task, status) {
  const progressBar = task.querySelector(".progress-fill");
  const progressContainer = task.querySelector(".progress");

  // Cancel any previous timer if exists
  const taskId = task.getAttribute("taskid");
  if (progressTimers.has(taskId)) {
    clearTimeout(progressTimers.get(taskId));
    progressTimers.delete(taskId);
  }

  switch (status) {
    case "progress":
      if (progressBar) {
        progressContainer.style.display = "block";
        progressBar.style.width = "67%";
      }

      // Start 10-second timer to move to In Review
      const timer = setTimeout(() => {
        const reviewCol = document.querySelector('.column[type="review"] .task-list');
        if (reviewCol && task.getAttribute("status") === "progress") {
          reviewCol.appendChild(task);
          task.setAttribute("status", "review");
          if (progressBar) progressBar.style.width = "100%";
          console.log(`Task ${taskId} automatically moved to In Review.`);
          updateTaskStatus(taskId, "review");
        }
      }, 10000);

      progressTimers.set(taskId, timer);
      break;

    case "review":
    case "done":
      if (progressBar) {
        progressContainer.style.display = "block";
        progressBar.style.width = "100%";
      }
      break;

    case "cancel":
      if (progressContainer) {
        progressContainer.style.display = "none";
      }
      break;

    case "toDo":
    default:
      // Retain whatever progress width currently is, no timer
      if (progressContainer) progressContainer.style.display = "block";
      break;
  }
}

// --- Attach listeners to all tasks ---
function attachDragListeners() {
  document.querySelectorAll('.task[draggable="true"]').forEach((task) => {
    task.removeEventListener("dragstart", drag);
    task.addEventListener("dragstart", drag);
  });
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("dragAndDrop.js loaded and attaching listeners.");
  attachDragListeners();

  document.querySelectorAll(".column").forEach((dropZone) => {
    dropZone.addEventListener("dragover", allowDrop);
    dropZone.addEventListener("drop", drop);
    dropZone.addEventListener("dragenter", dragEnter);
    dropZone.addEventListener("dragleave", dragLeave);
  });
});

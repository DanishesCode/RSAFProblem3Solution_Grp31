// Function called when a draggable element starts being dragged
function drag(ev) {
    // Set the task's ID as the data to be transferred
    // 'text/plain' is a standard type for text data
    ev.dataTransfer.setData("text/plain", ev.target.getAttribute('taskid'));
}

// Function called when a draggable element is dragged over a drop zone
function allowDrop(ev) {
    // Prevent the default handling (which is to not allow a drop)
    ev.preventDefault();
}

// Function called when a draggable element is dropped on a drop zone
function drop(ev) {
    ev.preventDefault();
    
    // 1. Get the data (the task ID) from the drag event
    const taskId = ev.dataTransfer.getData("text/plain");
    const draggedTask = document.querySelector(`.task[taskid="${taskId}"]`);
    
    // 2. Determine the drop target (the column's task-list)
    let dropTarget = ev.target;
    
    // Traverse up until we find the 'task-list' or 'column'
    while (dropTarget && !dropTarget.classList.contains('task-list') && !dropTarget.classList.contains('column')) {
        dropTarget = dropTarget.parentElement;
    }

    // Ensure we have a valid target column element
    if (draggedTask && dropTarget) {
        let taskList;
        let newStatus;
        
        if (dropTarget.classList.contains('column')) {
            // If dropped on the column itself, drop it into the .task-list inside
            taskList = dropTarget.querySelector('.task-list');
            newStatus = dropTarget.getAttribute('type');
        } else if (dropTarget.classList.contains('task-list')) {
            // If dropped directly on the task-list
            taskList = dropTarget;
            newStatus = dropTarget.closest('.column').getAttribute('type');
        }
        
        if (taskList) {
            // 3. Move the task element to the new column
            taskList.appendChild(draggedTask);
            
            // 4. Update the task's status attribute (important for persistence later)
            draggedTask.setAttribute('status', newStatus);
            
            // 5. You would typically call an API here to persist the status change
            // updateTaskStatus(taskId, newStatus); 
            console.log(`Task ${taskId} moved to status: ${newStatus}`);
        }
    }
}

// You can add a function to update the status via the backend API here.
/*
async function updateTaskStatus(taskId, newStatus) {
    // This part is for future development to integrate with your taskController
    // You'd need a PUT/PATCH endpoint on your server for status updates.
    
    try {
        const response = await fetch('/backlog/status-update', {
            method: 'PUT', // Or PATCH
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update task status on server');
        }
        const data = await response.json();
        console.log('Status updated successfully:', data);
        
    } catch (error) {
        console.error('Error updating status:', error);
        // Optional: Visually revert the task's position if API call fails
    }
}
*/
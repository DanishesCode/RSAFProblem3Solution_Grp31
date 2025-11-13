const agents = document.querySelectorAll('.agent-status.working');
setInterval(() => {
    agents.forEach(a => {
        const random = Math.floor(Math.random() * 75) + 5;
        a.textContent = `Working - ${random}%`;
    });
}, 2000);

function handleReviewDecision(button, action) {
    const task = button.closest('.task');
    const taskTitle = task.querySelector('.task-title').textContent;
    
    const confirmMessage = `Are you sure you want to ${action.toUpperCase()} the task "${taskTitle}"?`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    switch(action) {
        case 'accept':
            moveTaskToColumn(task, 'Done', 'Accepted by reviewer');
            showNotification(`Task "${taskTitle}" accepted and moved to Done!`, 'success');
            break;
            
        case 'retry':
            moveTaskToColumn(task, 'In Progress', 'Sent back for improvements');
            showNotification(`Task "${taskTitle}" sent back to In Progress for improvements.`, 'warning');
            break;
            
        case 'cancel':
            moveTaskToColumn(task, 'Cancelled', 'Cancelled by reviewer');
            showNotification(`Task "${taskTitle}" cancelled.`, 'error');
            break;
    }
}

function moveTaskToColumn(taskElement, columnName, reason) {

    const columns = document.querySelectorAll('.column');
    let targetColumn = null;
    
    columns.forEach(col => {
        const header = col.querySelector('.column-header').textContent;
        if (header === columnName) {
            targetColumn = col.querySelector('.task-list');
        }
    });
    
    if (targetColumn) {
        taskElement.classList.remove('review-task');
        const reviewActions = taskElement.querySelector('.review-actions');
        const aiProgress = taskElement.querySelector('.ai-progress');
        
        if (reviewActions) reviewActions.remove();
        if (aiProgress) aiProgress.innerHTML = `Status: ${reason}`;
        
        if (columnName === 'Done') {
            taskElement.style.opacity = '0.8';
            taskElement.style.background = '#f0fff0';
        } else if (columnName === 'Cancelled') {
            taskElement.style.opacity = '0.6';
            taskElement.style.background = '#ffe6e6';
        }
        
        targetColumn.appendChild(taskElement);
        
        taskElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            taskElement.style.transform = 'scale(1)';
        }, 200);
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    
    switch(type) {
        case 'success': notification.style.background = '#28a745'; break;
        case 'warning': notification.style.background = '#ffc107'; notification.style.color = '#212529'; break;
        case 'error': notification.style.background = '#dc3545'; break;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

let currentReviewTask = null;

function openReviewModal(taskElement) {
    currentReviewTask = taskElement;
    const modal = document.getElementById('reviewModal');
    
    const title = taskElement.querySelector('.task-title').textContent;
    const priority = taskElement.querySelector('.task-priority').textContent;
    const taskData = taskElement.querySelector('.task-data');
    
    const prompt = taskData.querySelector('.prompt').textContent;
    const repoName = taskData.querySelector('.repo-name').textContent;
    const codeChanges = taskData.querySelector('.code-changes').textContent;
    const progress = taskData.querySelector('.progress-percent').textContent;
    const agentName = taskData.querySelector('.agent-name').textContent;
    const workload = taskData.querySelector('.workload').textContent;
    const performance = taskData.querySelector('.performance').textContent;
    
    document.getElementById('modalTaskTitle').textContent = title;
    document.getElementById('modalPriority').textContent = priority;
    document.getElementById('modalPrompt').textContent = prompt;
    document.getElementById('modalRepoLink').innerHTML = `📁 In ${repoName} Repository <span class="expand-icon">⤢</span>`;
    document.getElementById('modalCodeInfo').textContent = codeChanges;
    document.getElementById('modalProgress').textContent = `${progress}%`;
    document.getElementById('modalProgressBar').style.width = `${progress}%`;
    document.getElementById('modalAgentName').textContent = agentName;
    document.getElementById('modalWorkload').textContent = `${workload}%`;
    document.getElementById('modalPerformance').textContent = `${performance}%`;
    
    const priorityBadge = document.getElementById('modalPriority');
    priorityBadge.className = 'priority-badge';
    if (priority.toLowerCase().includes('high')) {
        priorityBadge.style.background = '#dc3545';
        priorityBadge.style.color = 'white';
    } else if (priority.toLowerCase().includes('medium')) {
        priorityBadge.style.background = '#ffc107';
        priorityBadge.style.color = '#212529';
    } else {
        priorityBadge.style.background = '#28a745';
        priorityBadge.style.color = 'white';
    }
    
    modal.style.display = 'block';
}

function handleModalDecision(action) {
    if (!currentReviewTask) return;
    
    const taskTitle = currentReviewTask.querySelector('.task-title').textContent;
    
    document.getElementById('reviewModal').style.display = 'none';
    
    switch(action) {
        case 'accept':
            moveTaskToColumn(currentReviewTask, 'Done', 'Accepted by reviewer');
            showNotification(`Task "${taskTitle}" accepted and moved to Done!`, 'success');
            break;
            
        case 'retry':
            moveTaskToColumn(currentReviewTask, 'In Progress', 'Sent back for improvements');
            showNotification(`Task "${taskTitle}" sent back to In Progress for improvements.`, 'warning');
            break;
            
        case 'cancel':
            moveTaskToColumn(currentReviewTask, 'Cancelled', 'Cancelled by reviewer');
            showNotification(`Task "${taskTitle}" cancelled.`, 'error');
            break;
    }
    
    currentReviewTask = null;
}

document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('reviewModal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
});
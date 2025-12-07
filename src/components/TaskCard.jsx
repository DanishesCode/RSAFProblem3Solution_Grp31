import React, { useState } from 'react';

const TaskCard = ({ task, columnKey, onClick }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      taskId: task.taskid,
      fromColumn: columnKey
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) {
      onClick(task, columnKey);
    }
  };

  const getPriorityClass = (priority) => {
    if (!priority) return '';
    return priority.toLowerCase();
  };

  return (
    <div
      className={`task ${isDragging ? 'dragging' : ''}`}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      style={{ display: 'block' }}
      taskid={task.taskid}
      status={task.status}
      title={task.title}
      priority={task.priority}
      repo={task.repo}
      agentid={task.agentId || task.agentid}
      assignedagent={task.assignedAgent}
      description={task.description}
      requirements={JSON.stringify(task.requirements || [])}
      acceptcrit={JSON.stringify(task.acceptCrit || [])}
      agentprocess={task.agentProcess || ''}
    >
      <div className="task-title">{task.title || 'Untitled Task'}</div>
      <div className={`task-priority ${getPriorityClass(task.priority)}`}>
        {task.priority ? `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority` : 'Medium Priority'}
      </div>

      {task.progress !== undefined && (
        <div className="progress">
          <div 
            className="progress-fill" 
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      <div className="agentSelected">Agent: {task.assignedAgent || 'Unknown'}</div>
      <div className="repoSelected">Repo: {task.repo || 'No repo'}</div>
    </div>
  );
};

export default TaskCard;

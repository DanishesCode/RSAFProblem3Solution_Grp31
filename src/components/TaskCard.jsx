import React, { useState } from 'react';

const TaskCard = ({ task, columnKey, onClick }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      taskId: task.id,
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
      onClick();
    }
  };

  const getTaskClasses = () => {
    let classes = 'task';
    if (columnKey === 'inReview') classes += ' review-task';
    if (isDragging) classes += ' dragging';
    return classes;
  };

  return (
    <div
      className={getTaskClasses()}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      style={{
        opacity: columnKey === 'done' ? '0.8' : columnKey === 'cancelled' ? '0.6' : '1',
        background: columnKey === 'done' ? '#f0fff0' : columnKey === 'cancelled' ? '#ffe6e6' : undefined
      }}
    >
      <div className="task-title">{task.title}</div>
      <div className={`task-priority ${task.priority.toLowerCase()}`}>
        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
      </div>
      <div className="progress">
        <div 
          className="progress-fill" 
          style={{ width: `${task.progress}%` }}
        />
      </div>
      {columnKey === 'inReview' && (
        <div className="ai-progress">
          AI Progress: {task.description ? task.description.substring(0, 50) + '...' : 'Completed'}
        </div>
      )}
      <div>Agent: {task.agent}</div>
      <div>Repo: {task.repo}</div>
      {task.status && (
        <div>Status: {task.status}</div>
      )}
    </div>
  );
};

export default TaskCard;
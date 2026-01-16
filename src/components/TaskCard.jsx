import React, { useState, useEffect } from 'react';

const TaskCard = ({ task, columnKey, onClick }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [ownerName, setOwnerName] = useState('Loading...');

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

  // Fetch owner's GitHub name
  useEffect(() => {
    const fetchOwnerName = async () => {
      if (!task.ownerId) {
        setOwnerName('Unknown');
        return;
      }

      try {
        const res = await fetch(`http://localhost:3000/users/github/${task.ownerId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (res.ok) {
          const userData = await res.json();
          setOwnerName(userData.githubName || `User ${task.ownerId}`);
        } else {
          setOwnerName(`User ${task.ownerId}`);
        }
      } catch (error) {
        console.error('Error fetching owner name:', error);
        setOwnerName(`User ${task.ownerId}`);
      }
    };

    fetchOwnerName();
  }, [task.ownerId]);

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
      <div className="repoSelected">Owner: {ownerName}</div>
    </div>
  );
};

export default TaskCard;

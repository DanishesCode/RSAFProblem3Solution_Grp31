import React, { useState } from 'react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ columnKey, title, tasks, onTaskClick, onTaskMove }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskData = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { taskId, fromColumn } = taskData;
    
    if (fromColumn !== columnKey) {
      let reason;
      switch(columnKey) {
        case 'done':
          reason = 'Accepted by reviewer';
          break;
        case 'inProgress':
          reason = 'Sent back for improvements';
          break;
        case 'cancelled':
          reason = 'Cancelled by reviewer';
          break;
        default:
          reason = 'Moved';
      }
      
      onTaskMove(taskId, fromColumn, columnKey, reason);
    }
  };

  return (
    <div className={`column ${isDragOver ? 'drag-highlight' : ''}`}>
      <div className="column-header">{title}</div>
      <div 
        className={`task-list ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            columnKey={columnKey}
            onClick={() => columnKey === 'inReview' ? onTaskClick(task) : null}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;
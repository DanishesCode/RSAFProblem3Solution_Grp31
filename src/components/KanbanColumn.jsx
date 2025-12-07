import React, { useState } from 'react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ columnKey, title, tasks, onTaskClick, onTaskMove }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const taskData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { taskId, fromColumn } = taskData;
      
      if (fromColumn !== columnKey && onTaskMove) {
        onTaskMove(taskId, fromColumn, columnKey);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <div 
      className={`column ${isDragOver ? 'drag-over' : ''}`}
      type={columnKey}
    >
      <div className="column-header">{title}</div>
      <div 
        className="task-list"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.taskid}
            task={task}
            columnKey={columnKey}
            onClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanColumn;

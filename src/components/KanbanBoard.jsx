import React from 'react';
import KanbanColumn from './KanbanColumn';

const KanbanBoard = ({ tasks, onTaskClick, onTaskMove }) => {
  const columns = [
    { key: 'toDo', title: 'To Do' },
    { key: 'progress', title: 'In Progress' },
    { key: 'review', title: 'In Review' },
    { key: 'done', title: 'Done' },
    { key: 'cancel', title: 'Cancelled' }
  ];

  const getTasksForColumn = (columnKey) => {
    return tasks.filter(task => task.status === columnKey);
  };

  return (
    <main>
      {columns.map(column => (
        <KanbanColumn
          key={column.key}
          columnKey={column.key}
          title={column.title}
          tasks={getTasksForColumn(column.key)}
          onTaskClick={onTaskClick}
          onTaskMove={onTaskMove}
        />
      ))}
    </main>
  );
};

export default KanbanBoard;

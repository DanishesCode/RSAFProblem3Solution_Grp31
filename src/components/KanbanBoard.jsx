import React from 'react';
import KanbanColumn from './KanbanColumn';

const KanbanBoard = ({ tasks, onTaskClick, onTaskMove }) => {
  const columns = [
    { key: 'toDo', title: 'To Do', tasks: tasks.toDo },
    { key: 'inProgress', title: 'In Progress', tasks: tasks.inProgress },
    { key: 'inReview', title: 'In Review', tasks: tasks.inReview },
    { key: 'done', title: 'Done', tasks: tasks.done },
    { key: 'cancelled', title: 'Cancelled', tasks: tasks.cancelled }
  ];

  return (
    <main>
      {columns.map(column => (
        <KanbanColumn
          key={column.key}
          columnKey={column.key}
          title={column.title}
          tasks={column.tasks}
          onTaskClick={onTaskClick}
          onTaskMove={onTaskMove}
        />
      ))}
    </main>
  );
};

export default KanbanBoard;
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AgentSection from './components/AgentSection';
import KanbanBoard from './components/KanbanBoard';
import ReviewModal from './components/ReviewModal';

function App() {
  const [tasks, setTasks] = useState({
    toDo: [
      {
        id: 1,
        title: "Research dataset sources",
        priority: "high",
        progress: 20,
        agent: "Sage",
        repo: "github.com/org/repo-alpha"
      }
    ],
    inProgress: [
      {
        id: 2,
        title: "Train evaluation model",
        priority: "high",
        progress: 60,
        agent: "Scout",
        repo: "github.com/org/repo-ml"
      }
    ],
    inReview: [
      {
        id: 3,
        title: "Implement user authentication",
        priority: "medium",
        progress: 100,
        agent: "CodeBot",
        repo: "github.com/org/auth-module",
        prompt: "Make me thing please build user auth pies",
        description: "Implement secure user authentication system with login, registration, and session management features.",
        acceptance: "",
        codeChanges: "Shows github and changed code in the github",
        agentName: "Claude AI",
        workload: 61,
        performance: 40
      },
      {
        id: 4,
        title: "Optimize database queries",
        priority: "high",
        progress: 100,
        agent: "QueryMaster",
        repo: "github.com/org/db-optimization",
        prompt: "Optimize all database queries for better performance",
        description: "Analyze and optimize database queries to improve application performance, reduce response times, and enhance overall system efficiency.",
        acceptance: "",
        codeChanges: "Modified 3 query files with index optimizations",
        agentName: "QueryMaster AI",
        workload: 45,
        performance: 85
      }
    ],
    done: [],
    cancelled: []
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Move task between columns
  const moveTask = (taskId, fromColumn, toColumn, reason) => {
    setTasks(prev => {
      const newTasks = { ...prev };
      const taskIndex = newTasks[fromColumn].findIndex(task => task.id === taskId);
      
      if (taskIndex !== -1) {
        const task = newTasks[fromColumn][taskIndex];
        newTasks[fromColumn].splice(taskIndex, 1);
        
        // Update task properties based on destination
        const updatedTask = { ...task };
        if (toColumn === 'done') {
          updatedTask.status = 'Accepted by reviewer';
        } else if (toColumn === 'inProgress') {
          updatedTask.status = 'Sent back for improvements';
        } else if (toColumn === 'cancelled') {
          updatedTask.status = 'Cancelled by reviewer';
        }
        
        newTasks[toColumn].push(updatedTask);
      }
      
      return newTasks;
    });
  };

  // Open task details modal
  const openTaskModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Handle modal decisions
  const handleModalDecision = (action) => {
    if (!selectedTask) return;
    
    const fromColumn = Object.keys(tasks).find(column => 
      tasks[column].some(task => task.id === selectedTask.id)
    );
    
    let toColumn;
    switch(action) {
      case 'accept':
        toColumn = 'done';
        break;
      case 'retry':
        toColumn = 'inProgress';
        break;
      case 'cancel':
        toColumn = 'cancelled';
        break;
      default:
        return;
    }
    
    moveTask(selectedTask.id, fromColumn, toColumn, action);
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="App">
      <Header />
      <AgentSection />
      <KanbanBoard 
        tasks={tasks}
        onTaskClick={openTaskModal}
        onTaskMove={moveTask}
      />
      {isModalOpen && selectedTask && (
        <ReviewModal
          task={selectedTask}
          onClose={() => setIsModalOpen(false)}
          onDecision={handleModalDecision}
        />
      )}
    </div>
  );
}

export default App;
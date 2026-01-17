import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';
import AgentSection from './components/AgentSection';
import KanbanBoard from './components/KanbanBoard';
import CreateTaskModal from './components/CreateTaskModal';
import ReviewModal from './components/ReviewModal';
import DoneModal from './components/DoneModal';
import CancelledModal from './components/CancelledModal';
import ActivitySidebar from './components/ActivitySidebar';
import InProgressPanel from './components/InProgressPanel';
import NotificationContainer from './components/NotificationContainer';
import SelectionPage from './components/SelectionPage';
import MyBoards from './components/MyBoards';
import { initializeLogs, saveBacklog, updateTaskStatus } from './services/api';
import { isValidTransition } from './utils/taskTransitions';
import { useAgentStreaming } from './hooks/useAgentStreaming';
import './styles.css';

function App() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([
    { id: 1, name: 'Claude', status: 'working', workload: 0 },
    { id: 2, name: 'Gemini', status: 'offline', workload: 0 },
    { id: 3, name: 'OpenAI', status: 'working', workload: 0 }
  ]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalType, setModalType] = useState(null); // 'review', 'done', 'cancelled'
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ owners: [], agents: [], priorities: [] });
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [inProgressTask, setInProgressTask] = useState(null);
  const [repos, setRepos] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize auth state from localStorage immediately
    return !!localStorage.getItem('githubId');
  });

  // Check authentication - only run once on mount
  useEffect(() => {
    const githubId = localStorage.getItem('githubId');
    if (!githubId) {
      // Only navigate if we're not already on login page
      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
      return;
    }
    
    // Only set authenticated if not already set
    if (!isAuthenticated) {
      setIsAuthenticated(true);
    }
    
    // Load repos
    const reposString = localStorage.getItem('repos');
    if (reposString) {
      setRepos(reposString.split(',').filter(Boolean));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle task update
  const handleUpdateTask = useCallback(async (taskId, updates) => {
    setTasks(prev => prev.map(task => 
      task.taskid === taskId ? { ...task, ...updates } : task
    ));
  }, []);

  // Update agent workload
  const updateAgentWorkload = useCallback((taskList) => {
    const agentWork = { 1: 0, 2: 0, 3: 0 };
    
    if (taskList && taskList.length > 0) {
      taskList
        .filter(task => task.status === 'progress')
        .forEach(task => {
          const agentId = task.agentId || task.agentid;
          if (agentId && agentWork.hasOwnProperty(agentId)) {
            agentWork[agentId] += 20;
          }
        });
    }

    setAgents(prev => prev.map(agent => ({
      ...agent,
      workload: agentWork[agent.id] || 0,
      status: agentWork[agent.id] > 0 ? 'working' : 'offline'
    })));
  }, []);

  // Load initial tasks - only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadTasks = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        const logs = await initializeLogs(userId);
        setTasks(logs);
        updateAgentWorkload(logs);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };
    
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only run when authentication status changes

  // Handle AI agent streaming - only when authenticated
  // Temporarily disable to prevent refresh loops - will re-enable after fixing
  // useAgentStreaming(isAuthenticated ? tasks : [], handleUpdateTask);

  // Add notification
  const notify = useCallback((message, duration = 2500, type = 'error') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  // Add activity log
  const pushActivity = useCallback((activity) => {
    setActivityLogs(prev => [activity, ...prev]);
  }, []);

  // Handle task creation
  const handleCreateTask = async (taskData) => {
    try {
      taskData.userId = localStorage.getItem('userId');
      const saved = await saveBacklog(taskData);
      if (saved) {
        const newTask = {
          taskid: saved.taskid || `task-${Date.now()}`,
          title: saved.title,
          description: saved.description || '',
          priority: saved.priority || 'medium',
          status: saved.status || 'toDo',
          repo: saved.repo || '',
          agentId: saved.agentId || saved.agentid,
          assignedAgent: saved.assignedAgent || mapAgentIdToName(saved.agentId || saved.agentid),
          requirements: saved.requirements || [],
          acceptCrit: saved.acceptanceCriteria || [],
          progress: 0
        };
        setTasks(prev => [...prev, newTask]);
        updateAgentWorkload([...tasks, newTask]);
        pushActivity({
          title: newTask.title,
          agent: newTask.assignedAgent,
          status: 'Created',
          priority: newTask.priority,
          repo: newTask.repo,
          percent: 0
        });
        notify('Task created successfully', 2000, 'success');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      notify('Failed to create task', 3000, 'error');
    }
  };

  // Handle task move (drag and drop)
  const handleTaskMove = async (taskId, fromStatus, toStatus) => {
    if (!isValidTransition(fromStatus, toStatus)) {
      notify(`Invalid transition: ${fromStatus} → ${toStatus}`, 3000, 'error');
      return false;
    }

    // Check agent workload limit
    if (toStatus === 'progress') {
      const task = tasks.find(t => t.taskid === taskId);
      if (task) {
        const agentId = task.agentId || task.agentid;
        const inProgressCount = tasks.filter(t => 
          t.status === 'progress' && (t.agentId === agentId || t.agentid === agentId)
        ).length;
        
        if (inProgressCount >= 5) {
          notify(`Agent ${task.assignedAgent} already has 5 tasks in progress`, 3000, 'error');
          return false;
        }
      }
    }

    try {
      await updateTaskStatus(taskId, toStatus);
      
      const updatedTasks = tasks.map(task => {
        if (task.taskid === taskId) {
          const updated = { ...task, status: toStatus };
          
          // Handle progress updates
          if (toStatus === 'progress') {
            updated.progress = updated.progress > 0 ? updated.progress : 67;
          } else if (toStatus === 'review' || toStatus === 'done') {
            updated.progress = 100;
          } else if (toStatus === 'cancel') {
            updated.progress = 0;
          }
          
          pushActivity({
            title: updated.title,
            agent: updated.assignedAgent,
            status: toStatus === 'progress' ? 'In Progress' : 
                   toStatus === 'review' ? 'In Review' :
                   toStatus === 'done' ? 'Done' :
                   toStatus === 'cancel' ? 'Cancelled' : 'To Do',
            priority: updated.priority,
            repo: updated.repo,
            percent: updated.progress
          });
          
          return updated;
        }
        return task;
      });
      
      setTasks(updatedTasks);
      updateAgentWorkload(updatedTasks);
      
      // Auto-move from progress to review after 10 seconds
      if (toStatus === 'progress') {
        setTimeout(() => {
          handleTaskMove(taskId, 'progress', 'review');
        }, 10000);
      }
      
      return true;
    } catch (error) {
      console.error('Error moving task:', error);
      notify('Failed to move task', 3000, 'error');
      return false;
    }
  };

  // Handle task click
  const handleTaskClick = (task, status) => {
    if (status === 'toDo') {
      setEditingTask(task);
      setIsCreateModalOpen(true);
    } else if (status === 'progress') {
      setInProgressTask(task);
    } else if (status === 'review') {
      setSelectedTask(task);
      setModalType('review');
    } else if (status === 'done') {
      setSelectedTask(task);
      setModalType('done');
    } else if (status === 'cancel') {
      setSelectedTask(task);
      setModalType('cancelled');
    }
  };

  // Handle review decision
  const handleReviewDecision = async (decision) => {
    if (!selectedTask) return;
    
    let newStatus;
    if (decision === 'retry') {
      newStatus = 'progress';
    } else if (decision === 'accept') {
      newStatus = 'done';
    } else {
      newStatus = 'cancel';
    }
    
    await handleTaskMove(selectedTask.taskid, 'review', newStatus);
    setSelectedTask(null);
    setModalType(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Owner filter
    if (filters.owners && filters.owners.length > 0) {
      const ownerVal = task.ownerName || task.owner || (task.ownerId !== undefined && task.ownerId !== null ? String(task.ownerId) : "");
      if (!filters.owners.includes(ownerVal)) return false;
    }

    // Agent filter
    if (filters.agents && filters.agents.length > 0 && !filters.agents.includes(task.assignedAgent)) {
      return false;
    }

    // Priority filter
    if (filters.priorities && filters.priorities.length > 0) {
      const p = (task.priority || "").toLowerCase();
      if (!filters.priorities.includes(p)) return false;
    }
    
    return true;
  });

  // Helper function
  const mapAgentIdToName = (id) => {
    switch (String(id)) {
      case '1': return 'Claude';
      case '2': return 'Gemini';
      case '3': return 'OpenAI';
      default: return 'Unknown';
    }
  };

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="App">
      <NotificationContainer notifications={notifications} />
      <Header
        onNewTask={() => {
          setEditingTask(null);
          setIsCreateModalOpen(true);
        }}
        onActivityClick={() => setIsActivityOpen(true)}
        onFilterClick={() => setIsFilterOpen(!isFilterOpen)}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        isFilterOpen={isFilterOpen}
        onFilterChange={setFilters}
        tasks={tasks}
        repos={repos}
      />
      <AgentSection agents={agents} />
      <KanbanBoard
        tasks={filteredTasks}
        onTaskClick={handleTaskClick}
        onTaskMove={handleTaskMove}
      />
      
      {isCreateModalOpen && (
        <CreateTaskModal
          task={editingTask}
          repos={repos}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingTask(null);
          }}
          onCreate={handleCreateTask}
          onUpdate={handleUpdateTask}
          notify={notify}
        />
      )}
      
      {modalType === 'review' && selectedTask && (
        <ReviewModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setModalType(null);
          }}
          onDecision={handleReviewDecision}
        />
      )}
      
      {modalType === 'done' && selectedTask && (
        <DoneModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setModalType(null);
          }}
        />
      )}
      
      {modalType === 'cancelled' && selectedTask && (
        <CancelledModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setModalType(null);
          }}
        />
      )}
      
      <ActivitySidebar
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        activities={activityLogs}
      />
      
      {inProgressTask && (
        <InProgressPanel
          task={inProgressTask}
          onClose={() => setInProgressTask(null)}
          onUpdateProcessLog={(chunk) => {
            handleUpdateTask(inProgressTask.taskid, {
              agentProcess: (inProgressTask.agentProcess || '') + chunk
            });
          }}
        />
      )}
    </div>
  );
}

export default App;

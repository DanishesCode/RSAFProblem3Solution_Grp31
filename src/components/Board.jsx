import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './Header';
import AgentSection from './AgentSection';
import KanbanBoard from './KanbanBoard';
import CreateTaskModal from './CreateTaskModal';
import ReviewModal from './ReviewModal';
import DoneModal from './DoneModal';
import CancelledModal from './CancelledModal';
import ActivitySidebar from './ActivitySidebar';
import InProgressPanel from './InProgressPanel';
import NotificationContainer from './NotificationContainer';
import ManageMembersModal from './ManageMembersModal';
import { initializeLogs, saveBacklog, updateBacklog, updateTaskStatus, deleteBacklog } from '../services/api';
import { isValidTransition } from '../utils/taskTransitions';
import { useAgentStreaming } from '../hooks/useAgentStreaming';
import '../styles.css';

function Board() {
  const navigate = useNavigate();
  const { boardId: boardIdFromParams } = useParams();
  // Get boardId from URL params or localStorage
  const boardId = boardIdFromParams || localStorage.getItem('selectedBoardId');
  const [tasks, setTasks] = useState([]);
  const [agents, setAgents] = useState([
    { id: 1, name: 'Claude', status: 'working', workload: 0, logo: '/img/claude.png' },
    { id: 2, name: 'Gemini', status: 'offline', workload: 0, logo: '/img/gemini.png' },
    { id: 3, name: 'OpenAI', status: 'working', workload: 0, logo: '/img/openai.png' }
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [boardData, setBoardData] = useState(null);
  const [boardMembers, setBoardMembers] = useState([]);
  const [userRole, setUserRole] = useState(null); // 'owner' or 'editor'
  const [isReprompting, setIsReprompting] = useState(false); // Track if we're reprompting
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
    try {
      // Update existing task in backend using updateBacklog
      const userId = localStorage.getItem('userId') || localStorage.getItem('githubId');
      const taskToUpdate = tasks.find(t => t.taskid === taskId);
      
      if (taskToUpdate) {
        const updatedTaskData = {
          ...taskToUpdate,
          ...updates,
          userId: userId,
          ownerId: userId,
          taskid: taskId,
          // Ensure we have all required fields
          title: updates.title || taskToUpdate.title,
          prompt: updates.prompt || taskToUpdate.prompt || '',
          assignedAgent: updates.assignedAgent || taskToUpdate.assignedAgent,
          agentId: updates.agentId || taskToUpdate.agentId,
          requirements: updates.requirements || taskToUpdate.requirements || [],
          status: updates.status || taskToUpdate.status || 'toDo',
        };
        
        // Update in backend (not create)
        const saved = await updateBacklog(updatedTaskData);
        
        // Update local state
        setTasks(prev => prev.map(task => 
          task.taskid === taskId ? { ...task, ...updates, ...saved } : task
        ));
      } else {
        // Fallback: just update local state if task not found
        setTasks(prev => prev.map(task => 
          task.taskid === taskId ? { ...task, ...updates } : task
        ));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Still update local state even if backend fails
      setTasks(prev => prev.map(task => 
        task.taskid === taskId ? { ...task, ...updates } : task
      ));
    }
  }, [tasks]);

  // Update agent workload
  const updateAgentWorkload = useCallback((taskList) => {
    const agentWork = { 1: 0, 2: 0, 3: 0 };
    
    if (taskList && taskList.length > 0) {
      taskList
        .filter(task => task.status === 'progress')
        .forEach(task => {
          const agentId = task.agentId || task.agentid;
          const agentName = task.assignedAgent;
          
          // Match by agentId (1, 2, 3) or by agent name
          if (agentId && agentWork.hasOwnProperty(agentId)) {
            agentWork[agentId] += 20; // 20% per task, max 5 tasks = 100%
          } else if (agentName) {
            // Also match by name for cases where agentId might not be set
            const agentNameLower = agentName.toLowerCase();
            if (agentNameLower === 'claude') agentWork[1] += 20;
            else if (agentNameLower === 'gemini') agentWork[2] += 20;
            else if (agentNameLower === 'openai') agentWork[3] += 20;
          }
        });
    }

    // Cap workload at 100%
    Object.keys(agentWork).forEach(key => {
      if (agentWork[key] > 100) agentWork[key] = 100;
    });

    setAgents(prev => prev.map(agent => ({
      ...agent,
      workload: agentWork[agent.id] || 0,
      status: agentWork[agent.id] > 0 ? 'working' : 'offline'
    })));
  }, []);

  // Load board data if boardId is provided
  useEffect(() => {
    if (!isAuthenticated || !boardId) return;
    
    const loadBoardData = async () => {
      try {
        const res = await fetch(`http://localhost:3000/boards/${boardId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (res.ok) {
          const board = await res.json();
          setBoardData(board);
          
          // Determine user role
          const currentUserId = localStorage.getItem('userId') || localStorage.getItem('githubId');
          if (board.ownerId === currentUserId) {
            setUserRole('owner');
          } else if (board.memberIds?.includes(currentUserId)) {
            setUserRole('editor');
          }
          
          // Load member data with GitHub usernames
          if (board.memberIds && board.memberIds.length > 0) {
            // Fetch GitHub usernames for all members
            const memberPromises = board.memberIds.map(async (id) => {
              try {
                const userRes = await fetch(`http://localhost:3000/users/github/${id}`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                });
                
                let githubName = `User ${id}`;
                if (userRes.ok) {
                  const userData = await userRes.json();
                  githubName = userData.githubName || githubName;
                }
                
                return {
                  id: id,
                  name: githubName,
                  role: id === board.ownerId ? 'Owner' : 'Editor',
                  githubId: id
                };
              } catch (error) {
                console.error(`Error fetching user ${id}:`, error);
                return {
                  id: id,
                  name: `User ${id}`,
                  role: id === board.ownerId ? 'Owner' : 'Editor',
                  githubId: id
                };
              }
            });
            
            const members = await Promise.all(memberPromises);
            setBoardMembers(members);
          } else {
            setBoardMembers([]);
          }
        }
      } catch (error) {
        console.error('Error loading board data:', error);
      }
    };
    
    loadBoardData();
  }, [isAuthenticated, boardId]);

  // Load initial tasks - only when authenticated and boardId is available
  useEffect(() => {
    if (!isAuthenticated || !boardId) return;
    
    const loadTasks = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        // Load tasks by boardId instead of userId
        const logs = await initializeLogs(userId, boardId);
        setTasks(logs);
        updateAgentWorkload(logs);
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    };
    
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, boardId]); // Run when authentication status or boardId changes

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
      const userId = localStorage.getItem('userId') || localStorage.getItem('githubId');
      taskData.userId = userId;
      taskData.ownerId = userId; // Also set ownerId explicitly
      const saved = await saveBacklog(taskData);
      if (saved) {
        const newTask = {
          taskid: saved.taskid || `task-${Date.now()}`,
          title: saved.title,
          prompt: saved.prompt || '',
          priority: saved.priority || 'medium',
          status: saved.status || 'toDo',
          repo: saved.repo || '',
          ownerId: saved.ownerId || userId, // Include ownerId in the task object
          boardId: saved.boardId || taskData.boardId || '',
          agentId: saved.agentId || saved.agentid,
          assignedAgent: saved.assignedAgent || mapAgentIdToName(saved.agentId || saved.agentid),
          requirements: saved.requirements || [],
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

  // Call Gemini API to generate output for a task (via backend)
  const callGeminiAPI = async (task) => {
    try {
      notify(`Processing task with ${task.assignedAgent || 'AI'}...`, 2000, 'success');

      // Call backend endpoint that handles everything
      const response = await fetch('http://localhost:3000/ai/gemini/process-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          taskId: task.taskid
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const agentOutput = data.agentOutput || '';

      // Update local state
      setTasks(prev => prev.map(t => 
        t.taskid === task.taskid 
          ? { ...t, agentOutput: agentOutput }
          : t
      ));

      notify('AI processing complete!', 2000, 'success');
      return agentOutput;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      notify(`Failed to process task with AI: ${error.message}`, 3000, 'error');
      throw error;
    }
  };

  // Handle task move (drag and drop)
  const handleTaskMove = async (taskId, fromStatus, toStatus) => {
    if (!isValidTransition(fromStatus, toStatus)) {
      notify(`Invalid transition: ${fromStatus} → ${toStatus}`, 3000, 'error');
      return false;
    }

    // Check agent workload limit (max 5 tasks in progress)
    if (toStatus === 'progress') {
      const task = tasks.find(t => t.taskid === taskId);
      if (task) {
        const agentId = task.agentId || task.agentid;
        const agentName = task.assignedAgent;
        
        // Count tasks currently in progress for this agent (excluding the current task if it's already in progress)
        const isCurrentTaskInProgress = task.status === 'progress';
        const inProgressCount = tasks.filter(t => {
          if (t.taskid === taskId && isCurrentTaskInProgress) return false; // Don't count current task if it's already in progress
          const tAgentId = t.agentId || t.agentid;
          const tAgentName = t.assignedAgent;
          return t.status === 'progress' && (
            (tAgentId && tAgentId === agentId) ||
            (tAgentName && agentName && String(tAgentName).toLowerCase() === String(agentName).toLowerCase())
          );
        }).length;
        
        // If agent already has 5 tasks in progress, prevent adding a 6th
        if (inProgressCount >= 5) {
          notify(`Agent ${task.assignedAgent} already has 5 tasks in progress (maximum)`, 3000, 'error');
          return false;
        }
      }
    }

    try {
      await updateTaskStatus(taskId, toStatus);
      
      const task = tasks.find(t => t.taskid === taskId);
      
      const updatedTasks = tasks.map(t => {
        if (t.taskid === taskId) {
          const updated = { ...t, status: toStatus };
          
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
        return t;
      });
      
      setTasks(updatedTasks);
      updateAgentWorkload(updatedTasks);
      
      // When task moves to "progress", call Gemini API and auto-move to review
      if (toStatus === 'progress' && task) {
        try {
          // Call Gemini API (works for all agents - Gemini, Claude, OpenAI)
          await callGeminiAPI(task);
          
          // Automatically move to review after AI processing
          setTimeout(async () => {
            await updateTaskStatus(taskId, 'review');
            const reviewTasks = updatedTasks.map(t => {
              if (t.taskid === taskId) {
                const updated = { ...t, status: 'review', progress: 100 };
                pushActivity({
                  title: updated.title,
                  agent: updated.assignedAgent,
                  status: 'In Review',
                  priority: updated.priority,
                  repo: updated.repo,
                  percent: 100
                });
                return updated;
              }
              return t;
            });
            setTasks(reviewTasks);
            updateAgentWorkload(reviewTasks);
            notify('Task moved to review', 2000, 'success');
          }, 1000); // Small delay to ensure output is saved
        } catch (error) {
          console.error('Error processing task with AI:', error);
          // Task stays in progress even if AI fails
        }
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
    
    if (decision === 'reprompt') {
      // Close review modal first
      const taskToEdit = { ...selectedTask };
      setSelectedTask(null);
      setModalType(null);
      
      // Small delay to ensure review modal closes, then open edit modal
      setTimeout(() => {
        setEditingTask(taskToEdit);
        setIsCreateModalOpen(true);
        setIsReprompting(true); // Mark that we're reprompting
      }, 100);
    } else {
      let newStatus;
      if (decision === 'accept') {
        newStatus = 'done';
      } else if (decision === 'cancel') {
        newStatus = 'cancel';
      } else {
        return; // Unknown decision
      }
      
      await handleTaskMove(selectedTask.taskid, 'review', newStatus);
      setSelectedTask(null);
      setModalType(null);
    }
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

  // Handle inviting members
  const handleInviteMember = async (githubId) => {
    if (!boardId) {
      notify('No board selected', 3000, 'error');
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:3000/boards/${boardId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberIds: [githubId] }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        
        // Refresh board members with GitHub usernames
        if (updated.memberIds && updated.memberIds.length > 0) {
          const memberPromises = updated.memberIds.map(async (id) => {
            try {
              const userRes = await fetch(`http://localhost:3000/users/github/${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
              });
              
              let githubName = `User ${id}`;
              if (userRes.ok) {
                const userData = await userRes.json();
                githubName = userData.githubName || githubName;
              }
              
              return {
                id: id,
                name: githubName,
                role: id === updated.ownerId ? 'Owner' : 'Editor',
                githubId: id
              };
            } catch (error) {
              return {
                id: id,
                name: `User ${id}`,
                role: id === updated.ownerId ? 'Owner' : 'Editor',
                githubId: id
              };
            }
          });
          
          const members = await Promise.all(memberPromises);
          setBoardMembers(members);
        } else {
          setBoardMembers([]);
        }
        
        setBoardData(updated);
        notify('Member added successfully', 2000, 'success');
      } else {
        const error = await res.json().catch(() => ({ error: 'Failed to add member' }));
        notify(error.error || 'Failed to add member', 3000, 'error');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      notify('Failed to invite member', 3000, 'error');
    }
  };

  // Handle removing members (only for owner)
  const handleRemoveMember = async (member) => {
    if (!boardId || userRole !== 'owner') {
      notify('Only the owner can remove members', 3000, 'error');
      return;
    }
    
    if (member.role === 'Owner') {
      notify('Cannot remove the owner', 3000, 'error');
      return;
    }
    
    try {
      // Get current memberIds and remove the member
      const currentMemberIds = boardData.memberIds || [];
      const updatedMemberIds = currentMemberIds.filter(id => id !== member.githubId);
      
      const res = await fetch(`http://localhost:3000/boards/${boardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberIds: updatedMemberIds }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        
        // Refresh board members with GitHub usernames
        if (updated.memberIds && updated.memberIds.length > 0) {
          const memberPromises = updated.memberIds.map(async (id) => {
            try {
              const userRes = await fetch(`http://localhost:3000/users/github/${id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
              });
              
              let githubName = `User ${id}`;
              if (userRes.ok) {
                const userData = await userRes.json();
                githubName = userData.githubName || githubName;
              }
              
              return {
                id: id,
                name: githubName,
                role: id === updated.ownerId ? 'Owner' : 'Editor',
                githubId: id
              };
            } catch (error) {
              return {
                id: id,
                name: `User ${id}`,
                role: id === updated.ownerId ? 'Owner' : 'Editor',
                githubId: id
              };
            }
          });
          
          const members = await Promise.all(memberPromises);
          setBoardMembers(members);
        } else {
          setBoardMembers([]);
        }
        
        setBoardData(updated);
        notify('Member removed successfully', 2000, 'success');
      } else {
        const error = await res.json().catch(() => ({ error: 'Failed to remove member' }));
        notify(error.error || 'Failed to remove member', 3000, 'error');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      notify('Failed to remove member', 3000, 'error');
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
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      <AgentSection agents={agents} tasks={tasks} />
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
            setIsReprompting(false);
          }}
          onCreate={handleCreateTask}
          onUpdate={async (taskId, taskData) => {
            const wasReprompting = isReprompting;
            const originalStatus = editingTask?.status || 'review';
            
            await handleUpdateTask(taskId, taskData);
            
            // If this was a reprompt, move to progress after update
            if (wasReprompting) {
              setIsReprompting(false);
              // Small delay to ensure update is saved to backend
              setTimeout(async () => {
                await handleTaskMove(taskId, originalStatus, 'progress');
              }, 800);
            }
          }}
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
          onDelete={async (taskId) => {
            try {
              await deleteBacklog(taskId);
              setTasks(prev => {
                const updatedTasks = prev.filter(t => t.taskid !== taskId);
                updateAgentWorkload(updatedTasks);
                return updatedTasks;
              });
              notify('Task deleted successfully', 2000, 'success');
              setSelectedTask(null);
              setModalType(null);
            } catch (error) {
              console.error('Error deleting task:', error);
              notify('Failed to delete task', 3000, 'error');
            }
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

      {isSettingsOpen && (
        <ManageMembersModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onBack={() => {
            setIsSettingsOpen(false);
            navigate('/');
          }}
          members={boardMembers}
          userRole={userRole}
          onInviteMember={handleInviteMember}
          onRemoveMember={userRole === 'owner' ? handleRemoveMember : null}
          onError={(message) => notify(message, 3000, 'error')}
          boardName={boardData?.name}
          repo={boardData?.repo}
        />
      )}
    </div>
  );
}

export default Board;


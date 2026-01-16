import React from 'react';

const AgentSection = ({ agents, tasks = [] }) => {
  // Helper function to get agent status
  const getAgentStatus = (agent) => {
    // Check if agent has any tasks in progress
    const hasTasksInProgress = tasks.some(task => {
      const taskAgentId = task.agentId || task.agentid;
      const taskAgentName = task.assignedAgent;
      return task.status === 'progress' && (
        taskAgentId === agent.id || 
        String(taskAgentName || '').toLowerCase() === String(agent.name || '').toLowerCase()
      );
    });

    // Determine status based on workload and tasks
    if (hasTasksInProgress) {
      return { text: 'Working', color: 'green' };
    } else if (agent.workload >= 100) {
      return { text: 'Overload', color: 'red' };
    } else {
      return { text: 'Ready to work', color: 'blue' };
    }
  };

  // Helper function to get progress bar color class based on workload
  const getProgressBarColor = (workload) => {
    if (workload >= 81) return 'red'; // 81-100% (4-5 tasks)
    if (workload >= 41) return 'yellow'; // 41-80% (2-4 tasks)
    return 'green'; // 0-40% (0-2 tasks)
  };

  return (
    <section className="agents">
      {agents.map(agent => {
        const status = getAgentStatus(agent);
        const progressColor = getProgressBarColor(agent.workload);
        return (
          <div key={agent.id} className="agent">
            <div className="agent-logo">
              <img 
                src={agent.logo || '/placeholder-logo.png'} 
                alt={`${agent.name} logo`}
                onLoad={(e) => {
                  e.target.parentElement.style.background = 'transparent';
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="agent-logo-placeholder" style={{ display: 'none' }}>
                {agent.name.charAt(0)}
              </div>
            </div>
            <div className="agent-content">
              <div className="agent-name">{agent.name}</div>
              <div className="agent-status-container">
                <span className={`agent-status-bubble ${status.color}`}>
                  {status.text}
                </span>
                <span className="agent-workload">{agent.workload}%</span>
              </div>
              <div className="agent-progress-bar-container">
                <div className="agent-progress-bar">
                  <div 
                    className={`agent-progress-fill ${progressColor}`}
                    style={{ width: `${agent.workload}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default AgentSection;

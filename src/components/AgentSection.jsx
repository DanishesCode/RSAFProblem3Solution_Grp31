import React, { useState, useEffect } from 'react';

const AgentSection = () => {
  const [agents, setAgents] = useState([
    { id: 1, name: "Agent Name1", logo: "S", status: "working", workload: 45 },
    { id: 2, name: "Agent Name2", logo: "P", status: "offline", workload: 0 }
  ]);

  // Simulate agent workload updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => 
        agent.status === 'working' 
          ? { ...agent, workload: Math.floor(Math.random() * 75) + 5 }
          : agent
      ));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="agents">
      {agents.map(agent => (
        <div key={agent.id} className="agent">
          <div className="agent-logo">{agent.logo}</div>
          <div>
            <div>{agent.name}</div>
            <div className={`agent-status ${agent.status}`}>
              {agent.status === 'working' 
                ? `Working - ${agent.workload}%` 
                : 'Offline - 0%'
              }
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default AgentSection;
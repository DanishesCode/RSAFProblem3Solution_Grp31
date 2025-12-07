import React from 'react';

const AgentSection = ({ agents }) => {
  return (
    <section className="agents">
      {agents.map(agent => (
        <div key={agent.id} className="agent">
          <div>
            <div>{agent.name}</div>
            <div className={`agent-status ${agent.status} ${
              agent.workload === 0 ? 'green' :
              agent.workload <= 40 ? 'green' :
              agent.workload <= 80 ? 'yellow' : 'red'
            }`}>
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

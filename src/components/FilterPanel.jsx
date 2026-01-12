import React, { useState, useEffect } from 'react';

const FilterPanel = ({ tasks, onClose, onFilterChange }) => {
  const [selectedRepos, setSelectedRepos] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);

  const reposSet = new Set();
  const agentsSet = new Set();

  tasks.forEach(task => {
    if (task.repo) reposSet.add(task.repo);
    if (task.assignedAgent) agentsSet.add(task.assignedAgent);
  });

  const repos = Array.from(reposSet).sort();
  const agents = Array.from(agentsSet).sort();

  useEffect(() => {
    onFilterChange({ repos: selectedRepos, agents: selectedAgents });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepos, selectedAgents]); // onFilterChange is stable, don't include it

  const handleRepoToggle = (repo) => {
    setSelectedRepos(prev => 
      prev.includes(repo) 
        ? prev.filter(r => r !== repo)
        : [...prev, repo]
    );
  };

  const handleAgentToggle = (agent) => {
    setSelectedAgents(prev => 
      prev.includes(agent)
        ? prev.filter(a => a !== agent)
        : [...prev, agent]
    );
  };

  const clearFilters = () => {
    setSelectedRepos([]);
    setSelectedAgents([]);
  };

  return (
    <div id="filterPanel" className="filter-panel">
      <div className="filter-panel-inner">
        <div className="filter-header">
          <strong>Filter Tasks</strong>
          <button id="close-filter" className="close-filter" onClick={onClose}>✕</button>
        </div>

        <div className="filter-section">
          <div className="filter-section-title">Repository</div>
          <div id="filter-repos">
            {repos.map(repo => (
              <label key={repo}>
                <span className="filter-text">{repo}</span>
                <input
                  type="checkbox"
                  className="filter-repo"
                  value={repo}
                  checked={selectedRepos.includes(repo)}
                  onChange={() => handleRepoToggle(repo)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-title">Agent</div>
          <div id="filter-agents">
            {agents.map(agent => (
              <label key={agent}>
                <span className="filter-text">{agent}</span>
                <input
                  type="checkbox"
                  className="filter-agent"
                  value={agent}
                  checked={selectedAgents.includes(agent)}
                  onChange={() => handleAgentToggle(agent)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="filter-actions">
          <button id="clear-filters" className="filter-clear" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;


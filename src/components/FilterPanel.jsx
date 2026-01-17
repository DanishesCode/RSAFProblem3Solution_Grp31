import React, { useState, useEffect } from 'react';

const FilterPanel = ({ tasks, onClose, onFilterChange }) => {
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);

  const agentsSet = new Set();
  // ownerEntries: { id: string (ownerId or name), label: displayName }
  const [ownerEntries, setOwnerEntries] = useState([]);
  const [ownerMap, setOwnerMap] = useState({}); // ownerId -> display name

  // gather agent ids and potential owners
  const tempOwners = new Map();
  tasks.forEach(task => {
    if (task.assignedAgent) agentsSet.add(task.assignedAgent);

    // determine owner id (prefer numeric ownerId if present)
    if (task.ownerId !== undefined && task.ownerId !== null && task.ownerId !== "") {
      tempOwners.set(String(task.ownerId), null);
    } else if (task.owner) {
      tempOwners.set(String(task.owner), task.owner);
    } else if (task.ownerName) {
      tempOwners.set(String(task.ownerName), task.ownerName);
    }
  });

  const agents = Array.from(agentsSet).sort();

  // Build ownerEntries and fetch missing owner names when tasks change
  useEffect(() => {
    let mounted = true;
    const ids = Array.from(tempOwners.keys());

    // Start with map from available task-provided names
    const initialMap = {};
    tempOwners.forEach((val, key) => {
      if (val) initialMap[key] = val;
    });

    // Find ids that need fetching (numeric ids without label)
    const needFetch = ids.filter(id => !initialMap[id] && /^\d+$/.test(id));

    async function fetchNames() {
      const map = { ...initialMap };
      await Promise.all(needFetch.map(async id => {
        try {
          const res = await fetch(`http://localhost:3000/users/github/${id}`);
          if (res.ok) {
            const json = await res.json();
            map[id] = json.githubName || `User ${id}`;
          } else {
            map[id] = `User ${id}`;
          }
        } catch (e) {
          map[id] = `User ${id}`;
        }
      }));

      if (!mounted) return;
      setOwnerMap(map);
      const entries = ids.map(id => ({ id, label: map[id] || id }));
      entries.sort((a,b) => a.label.localeCompare(b.label));
      setOwnerEntries(entries);
    }

    // synchronous build if no fetch required
    if (needFetch.length === 0) {
      const map = { ...initialMap };
      setOwnerMap(map);
      const entries = ids.map(id => ({ id, label: map[id] || id }));
      entries.sort((a,b) => a.label.localeCompare(b.label));
      setOwnerEntries(entries);
    } else {
      fetchNames();
    }

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tasks)]);

  useEffect(() => {
    onFilterChange({ owners: selectedOwners, agents: selectedAgents, priorities: selectedPriorities });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOwners, selectedAgents, selectedPriorities]); // onFilterChange is stable, don't include it

  const handleAgentToggle = (agent) => {
    setSelectedAgents(prev => 
      prev.includes(agent)
        ? prev.filter(a => a !== agent)
        : [...prev, agent]
    );
  };
  
  const handleOwnerToggle = (owner) => {
    setSelectedOwners(prev => 
      prev.includes(owner) ? prev.filter(o => o !== owner) : [...prev, owner]
    );
  };

  const handlePriorityToggle = (p) => {
    setSelectedPriorities(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const clearFilters = () => {
    setSelectedOwners([]);
    setSelectedAgents([]);
    setSelectedPriorities([]);
  };

  return (
    <div id="filterPanel" className="filter-panel">
      <div className="filter-panel-inner">
        <div className="filter-header">
          <strong>Filter Tasks</strong>
          <button id="close-filter" className="close-filter" onClick={onClose}>✕</button>
        </div>

        <div className="filter-section">
          <div className="filter-section-title">Agent</div>
          <div id="filter-agents">
            {agents.map(agent => (
              <span
                key={agent}
                className={`filter-word ${selectedAgents.includes(agent) ? 'selected' : ''}`}
                onClick={() => handleAgentToggle(agent)}
                style={{ cursor: 'pointer', marginRight: 8 }}
              >
                {agent}
              </span>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-title">Owner</div>
          <div id="filter-owners">
            {ownerEntries.map(({id, label}) => (
              <span
                key={id}
                className={`filter-word ${selectedOwners.includes(id) ? 'selected' : ''}`}
                onClick={() => handleOwnerToggle(id)}
                style={{ cursor: 'pointer', marginRight: 8 }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-title">Priority</div>
          <div id="filter-priority">
            {["low", "medium", "high"].map(p => (
              <span
                key={p}
                className={`filter-word ${selectedPriorities.includes(p) ? 'selected' : ''}`}
                onClick={() => handlePriorityToggle(p)}
                style={{ cursor: 'pointer', marginRight: 8 }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
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


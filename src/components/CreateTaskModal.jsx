import React, { useState, useEffect } from 'react';

const CreateTaskModal = ({ task, repos, onClose, onCreate, onUpdate, notify }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedTags, setSelectedTags] = useState([]);
  const [requirements, setRequirements] = useState(['']);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(['']);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const tags = [
    { value: 'frontend', label: 'frontend' },
    { value: 'backend', label: 'backend' },
    { value: 'ui-ux', label: 'ui-ux' }
  ];

  const agents = [
    { id: 1, name: 'Claude', filter: 'backend' },
    { id: 2, name: 'Gemini', filter: 'frontend' },
    { id: 3, name: 'OpenAI', filter: 'ui-ux' }
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setRequirements(Array.isArray(task.requirements) ? task.requirements : ['']);
      setAcceptanceCriteria(Array.isArray(task.acceptCrit) ? task.acceptCrit : ['']);
      setSelectedRepo(task.repo || null);
      setSelectedAgent(task.assignedAgent || null);
    } else {
      resetForm();
    }
  }, [task]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSelectedTags([]);
    setRequirements(['']);
    setAcceptanceCriteria(['']);
    setSelectedRepo(null);
    setSelectedAgent(null);
  };

  const handleTagToggle = (tagValue) => {
    setSelectedTags(prev => 
      prev.includes(tagValue)
        ? prev.filter(t => t !== tagValue)
        : [...prev, tagValue]
    );
  };

  const addRequirement = () => {
    setRequirements(prev => [...prev, '']);
  };

  const updateRequirement = (index, value) => {
    setRequirements(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addAcceptanceCriterion = () => {
    setAcceptanceCriteria(prev => [...prev, '']);
  };

  const updateAcceptanceCriterion = (index, value) => {
    setAcceptanceCriteria(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async () => {
    const filteredRequirements = requirements.filter(r => r.trim() !== '');
    const filteredAcceptance = acceptanceCriteria.filter(a => a.trim() !== '');

    if (!title.trim()) {
      notify('Task Title is required', 3000, 'error');
      return;
    }
    if (!description.trim()) {
      notify('Description is required', 3000, 'error');
      return;
    }
    if (!selectedAgent) {
      notify('Assigned Agent is required', 3000, 'error');
      return;
    }
    if (!selectedRepo) {
      notify('GitHub Project is required', 3000, 'error');
      return;
    }
    if (filteredRequirements.length === 0) {
      notify('At least one Requirement is required', 3000, 'error');
      return;
    }
    if (filteredAcceptance.length === 0) {
      notify('At least one Acceptance Criterion is required', 3000, 'error');
      return;
    }

    const agent = agents.find(a => a.name === selectedAgent);
    
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      requirements: filteredRequirements,
      acceptanceCriteria: filteredAcceptance,
      assignedAgent: selectedAgent,
      agentId: agent?.id,
      repo: selectedRepo,
      status: 'toDo'
    };

    if (task) {
      await onUpdate(task.taskid, taskData);
      notify('Task updated successfully', 2000, 'success');
    } else {
      await onCreate(taskData);
    }
    
    onClose();
  };

  const filteredAgents = selectedTags.length === 0
    ? agents
    : agents.filter(agent => 
        selectedTags.some(tag => agent.filter.includes(tag))
      );

  return (
    <div id="addNewTaskPanel" style={{ display: 'block' }}>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{task ? 'Edit Task' : 'Create New Task'}</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            <label>Task Title</label>
            <input
              type="text"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label>Description</label>
            <textarea
              placeholder="Describe the task in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="high">High</option>
            </select>

            <label>Required Capabilities</label>
            <div className="tags">
              {tags.map(tag => (
                <span
                  key={tag.value}
                  value={tag.value}
                  className={selectedTags.includes(tag.value) ? 'selected' : ''}
                  onClick={() => handleTagToggle(tag.value)}
                >
                  {tag.label}
                </span>
              ))}
            </div>

            <label>Requirements</label>
            <div id="requirements-container">
              {requirements.map((req, index) => (
                <div key={index} className="add-row">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updateRequirement(index, e.target.value)}
                    placeholder="Enter requirement..."
                  />
                  <button className="add-btn" onClick={addRequirement}>+</button>
                </div>
              ))}
            </div>

            <label>Acceptance Criteria</label>
            <div id="acceptance-container">
              {acceptanceCriteria.map((acc, index) => (
                <div key={index} className="add-row">
                  <input
                    type="text"
                    value={acc}
                    onChange={(e) => updateAcceptanceCriterion(index, e.target.value)}
                    placeholder="Enter acceptance criterion..."
                  />
                  <button className="add-btn" onClick={addAcceptanceCriterion}>+</button>
                </div>
              ))}
            </div>

            <label className="github-label">Select GitHub Project</label>
            <div className="github-projects">
              {repos.map(repo => (
                <div
                  key={repo}
                  className={`repo-card ${selectedRepo === repo ? 'selected' : ''}`}
                  onClick={() => setSelectedRepo(repo)}
                >
                  <strong value={repo}>{repo}</strong>
                </div>
              ))}
            </div>

            <label className="assign-label">Assign Agent</label>
            {filteredAgents.map(agent => (
              <div
                key={agent.id}
                className={`agent-card ${selectedAgent === agent.name ? 'selected' : ''}`}
                value={agent.name}
                filter={agent.filter}
                agentId={agent.id}
                onClick={() => setSelectedAgent(agent.name)}
              >
                <div>
                  <strong>{agent.name}</strong>
                  <p>Workload: 0% • Performance: {agent.id === 1 ? '88%' : agent.id === 2 ? '95%' : '90%'}</p>
                </div>
              </div>
            ))}

            <div className="modal-footer">
              <button className="cancel" onClick={onClose}>Cancel</button>
              <button 
                id="createBtn" 
                className={task ? 'save' : 'create'}
                onClick={handleSubmit}
              >
                {task ? 'Save' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;


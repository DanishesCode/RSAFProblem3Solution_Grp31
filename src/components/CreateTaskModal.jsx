import React, { useState, useEffect } from 'react';

const CreateTaskModal = ({ task, repos, boardRepo, onClose, onCreate, onUpdate, notify }) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedTags, setSelectedTags] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);

  const tags = [
    { value: 'frontend', label: 'frontend' },
    { value: 'backend', label: 'backend' },
    { value: 'ui-ux', label: 'ui-ux' }
  ];

  const agents = [
    { id: 1, name: 'DeepSeek', filter: 'frontend' },
    { id: 2, name: 'Gemma', filter: 'backend' },
    { id: 3, name: 'GPT_OSS', filter: 'ui-ux' }
  ];

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setPrompt(task.prompt || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setRequirements(Array.isArray(task.requirements) ? task.requirements.filter(r => r.trim() !== '') : []);
      setRequirementInput('');
      setSelectedAgent(task.assignedAgent || null);
    } else {
      resetForm();
    }
  }, [task]);

  const resetForm = () => {
    setTitle('');
    setPrompt('');
    setDescription('');
    setPriority('medium');
    setSelectedTags([]);
    setRequirements([]);
    setRequirementInput('');
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
    const value = requirementInput.trim();
    if (!value) return;
    
    // Check for duplicates
    if (requirements.includes(value)) {
      notify('This requirement already exists', 2000, 'error');
      return;
    }
    
    setRequirements(prev => [...prev, value]);
    setRequirementInput('');
  };

  const removeRequirement = (requirement) => {
    setRequirements(prev => prev.filter(r => r !== requirement));
  };


  const handleSubmit = async () => {
    const filteredRequirements = requirements.filter(r => r.trim() !== '');

    // Required fields validation
    if (!title.trim()) {
      notify('Task Title is required', 3000, 'error');
      return;
    }
    if (!prompt.trim()) {
      notify('Prompt is required', 3000, 'error');
      return;
    }
    if (!selectedAgent) {
      notify('Assigned Agent (AI) is required', 3000, 'error');
      return;
    }

    const agent = agents.find(a => a.name === selectedAgent);
    
    // Get repo: prioritize board's repo, then task's existing repo, then first repo from list
    const repo = boardRepo || (task?.repo) || (repos && repos.length > 0 ? repos[0] : '');
    
    // Get boardId from localStorage or props if available
    const boardId = localStorage.getItem('selectedBoardId') || '';
    
    const taskData = {
      title: title.trim(),
      prompt: prompt.trim(),
      description: description.trim(), // Optional field
      priority,
      requirements: filteredRequirements, // Optional field
      assignedAgent: selectedAgent,
      agentId: agent?.id,
      repo: repo,
      boardId: boardId,
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
            <label>Task Title <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              placeholder="Enter task title... (Required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <label>Prompt <span style={{ color: 'red' }}>*</span></label>
            <textarea
              placeholder="Enter your prompt here... (Required)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              required
            />

            <label>Description (Optional)</label>
            <textarea
              placeholder="Enter task description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
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

            <label>Requirements (Optional)</label>
            <div className="requirement-input-row">
              <input
                type="text"
                value={requirementInput}
                onChange={(e) => setRequirementInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRequirement();
                  }
                }}
                placeholder="Enter requirement and press Enter..."
                className="requirement-input"
              />
              <button 
                className="requirement-add-btn" 
                onClick={addRequirement}
                type="button"
              >
                Add
              </button>
            </div>
            
            {requirements.length > 0 && (
              <div className="requirement-tags">
                {requirements.map((req, index) => (
                  <span key={index} className="requirement-tag">
                    {req}
                    <button
                      type="button"
                      className="requirement-tag-remove"
                      onClick={() => removeRequirement(req)}
                      aria-label={`Remove ${req}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <label className="assign-label">Assign Agent (AI) <span style={{ color: 'red' }}>*</span></label>
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


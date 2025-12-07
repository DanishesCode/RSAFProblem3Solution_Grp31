import React from 'react';

const DoneModal = ({ task, onClose }) => {
  if (!task) return null;

  const getPriorityStyle = () => {
    const priority = (task.priority || 'medium').toLowerCase();
    if (priority === 'high') {
      return { background: '#dc3545', color: 'white' };
    } else if (priority === 'medium') {
      return { background: '#ffc107', color: '#212529' };
    } else {
      return { background: '#28a745', color: 'white' };
    }
  };

  const parseArray = (value) => {
    if (!value) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.join(', ');
        return parsed;
      } catch {
        return value;
      }
    }
    return String(value);
  };

  const acceptance = parseArray(task.acceptCrit);
  const progress = task.progress || 100;
  const agentName = task.assignedAgent || 'Unknown';

  return (
    <div id="doneModal" className="review-modal" style={{ display: 'flex' }}>
      <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <span className="done-close" onClick={onClose}>&times;</span>
          <h3 id="done-task-title">{task.title || 'Untitled Task'}</h3>
          <div id="done-priority-badge" className="priority-badge" style={getPriorityStyle()}>
            {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
          </div>
        </div>
        
        <div className="review-modal-body">
          <div className="review-section">
            <label>Prompt used:</label>
            <div className="prompt-box" id="done-prompt">
              {task.description || 'No prompt provided'}
            </div>
          </div>

          <div className="review-section">
            <label>Acceptance</label>
            <div className="acceptance-box" id="done-acceptance">
              {acceptance || 'No acceptance criteria provided'}
            </div>
          </div>

          <div className="review-section">
            <label>Appended Code</label>
            <button className="repo-link" id="done-repo-link">
              📁 <span id="done-repo-name">In {(task.repo || 'Repository').split('/').pop()}</span>
              <span className="expand-icon">⤢</span>
            </button>
            <div className="code-info" id="done-code-changes">
              {task.agentProcess || 'Shows github and changed code in the github'}
            </div>
          </div>

          <div className="review-section">
            <label id="done-progress-label">Progress: {Math.round(progress)}%</label>
            <div className="progress-bar">
              <div 
                className="progress-fill-modal" 
                id="done-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="review-section">
            <label>Assigned AI Agent</label>
            <div className="agent-info">
              <div className="agent-icon">🤖</div>
              <div className="agent-details">
                <div className="agent-name" id="done-agent-name">{agentName}</div>
                <div className="agent-status-modal" id="done-agent-status">
                  Workload: {task.workload || 61}% Performance: {task.performance || 40}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoneModal;


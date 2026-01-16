import React from 'react';

const CancelledModal = ({ task, onClose, onDelete }) => {
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

  const parseRequirements = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(r => r && r.trim() !== '');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(r => r && r.trim() !== '');
        return [parsed].filter(r => r && r.trim() !== '');
      } catch {
        // If it's a comma-separated string, split it
        if (value.includes(',')) {
          return value.split(',').map(v => v.trim()).filter(Boolean);
        }
        // If it's a single requirement string
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
      }
    }
    return [];
  };

  const requirements = parseRequirements(task.requirements);
  const progress = task.progress || 0;
  const agentName = task.assignedAgent || 'Unknown';

  return (
    <div id="cancelledModal" className="review-modal" style={{ display: 'flex' }}>
      <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <span className="cancelled-close" onClick={onClose}>&times;</span>
          <h3 id="cancelled-task-title">{task.title || 'Untitled Task'}</h3>
          <div id="cancelled-priority-badge" className="priority-badge" style={getPriorityStyle()}>
            {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
          </div>
        </div>
        
        <div className="review-modal-body">
          <div className="review-section">
            <label>Prompt used:</label>
            <div className="prompt-box" id="cancelled-prompt">
              {task.prompt || task.description || 'No prompt provided'}
            </div>
          </div>

          <div className="review-section">
            <label>Requirements</label>
            {requirements.length > 0 ? (
              <div className="requirement-tags">
                {requirements.map((req, index) => (
                  <span key={index} className="requirement-tag">
                    {req}
                  </span>
                ))}
              </div>
            ) : (
              <div className="acceptance-box" id="cancelled-acceptance">
                No requirements provided
              </div>
            )}
          </div>

          <div className="review-section">
            <label>AI Output</label>
            <div className="code-info" id="cancelled-code-changes">
              {task.agentOutput || task.agentProcess || 'No output generated yet'}
            </div>
          </div>

          <div className="review-section">
            <label id="cancelled-progress-label">Progress: {Math.round(progress)}%</label>
            <div className="progress-bar">
              <div 
                className="progress-fill-modal" 
                id="cancelled-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="review-section">
            <label>Assigned AI Agent</label>
            <div className="agent-info">
              <div className="agent-icon">🤖</div>
              <div className="agent-details">
                <div className="agent-name" id="cancelled-agent-name">{agentName}</div>
                <div className="agent-status-modal" id="cancelled-agent-status">
                  Workload: {task.workload || 61}% Performance: {task.performance || 40}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="review-modal-footer">
          <button className="btn-delete" onClick={() => onDelete && onDelete(task.taskid)}>
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelledModal;


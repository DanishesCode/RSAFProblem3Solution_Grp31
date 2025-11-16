import React, { useEffect, useRef } from 'react';

const ReviewModal = ({ task, onClose, onDecision }) => {
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getPriorityStyle = () => {
    const priority = task.priority.toLowerCase();
    if (priority === 'high') {
      return { background: '#dc3545', color: 'white' };
    } else if (priority === 'medium') {
      return { background: '#ffc107', color: '#212529' };
    } else {
      return { background: '#28a745', color: 'white' };
    }
  };

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <span className="close" onClick={onClose}>&times;</span>
          <h3>{task.title}</h3>
          <div className="priority-badge" style={getPriorityStyle()}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </div>
        </div>
        
        <div className="modal-body">
          <div className="section">
            <label>Prompt used:</label>
            <div className="prompt-box">
              {task.prompt || 'No prompt provided'}
            </div>
          </div>

          <div className="section">
            <label>Description</label>
            <div className="description-box">
              {task.description || 'No description provided'}
            </div>
          </div>

          <div className="section">
            <label>Acceptance</label>
            <div className="acceptance-box">
              {task.acceptance || ''}
            </div>
          </div>

          <div className="section">
            <label>Appended Code</label>
            <button className="repo-link">
              📁 In {task.repo?.split('/').pop() || 'Repository'}
              <span className="expand-icon">⤢</span>
            </button>
            <div className="code-info">
              {task.codeChanges || 'No code changes specified'}
            </div>
          </div>

          <div className="section">
            <label>Progress: {task.progress}%</label>
            <div className="progress-bar">
              <div 
                className="progress-fill-modal" 
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>

          <div className="section">
            <label>Assigned AI Agent</label>
            <div className="agent-info">
              <div className="agent-icon">🤖</div>
              <div className="agent-details">
                <div className="agent-name">{task.agentName || task.agent}</div>
                <div className="agent-status-modal">
                  Workload: {task.workload || 0}% Performance: {task.performance || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-reject" onClick={() => onDecision('cancel')}>
            Reject
          </button>
          <button className="btn-try-again" onClick={() => onDecision('retry')}>
            Try Again
          </button>
          <button className="btn-accept-modal" onClick={() => onDecision('accept')}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
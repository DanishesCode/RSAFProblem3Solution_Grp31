import React, { useState, useEffect, useRef } from 'react';

const InProgressPanel = ({ task, onClose, onUpdateProcessLog }) => {
  const [isPaused, setIsPaused] = useState(false);
  const thinkingRef = useRef(null);

  useEffect(() => {
    if (thinkingRef.current && task.agentProcess) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [task.agentProcess]);

  const handleStop = () => {
    onClose();
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const parseProcessLog = (process) => {
    if (!process) return '';
    if (typeof process === 'string') {
      try {
        const parsed = JSON.parse(process);
        if (Array.isArray(parsed)) return parsed.join('\n');
        return parsed;
      } catch {
        return process;
      }
    }
    return String(process);
  };

  const processText = parseProcessLog(task.agentProcess || '');

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

  return (
    <div id="inprg-panel" style={{ display: 'flex' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="inprg-header">
          <button className="btn-close" title="Close" onClick={onClose}>&times;</button>
          <h3>{task.title || 'Task In Progress'}</h3>
          <div className="priority-badge" style={getPriorityStyle()}>
            {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
          </div>
        </div>
        <div className="inprg-body">
          <div className="review-section">
            <label>Prompt used:</label>
            <div className="prompt-box">
              {task.prompt || task.description || 'No prompt provided'}
            </div>
          </div>

          <div className="review-section">
            <label>Assigned AI Agent</label>
            <div className="agent-info">
              <div className="agent-icon">🤖</div>
              <div className="agent-details">
                <div className="agent-name">{task.assignedAgent || 'Unknown'}</div>
                <div className="agent-status-modal">
                  Processing task...
                </div>
              </div>
            </div>
          </div>

          {task.description && task.description !== task.prompt && (
            <div className="review-section">
              <label>Description</label>
              <div className="description-box">
                {task.description}
              </div>
            </div>
          )}

          <div className="review-section">
            <label>AI Output</label>
            <div 
              className="code-info" 
              aria-live="polite"
              ref={thinkingRef}
              style={{ 
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '300px',
                overflow: 'auto'
              }}
            >
              {processText || 'Processing your request...'}
            </div>
          </div>
        </div>
        <div className="inprg-footer">
          <button className="btn-pause" onClick={handlePause}>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button className="btn-stop" onClick={handleStop}>Stop</button>
        </div>
      </div>
    </div>
  );
};

export default InProgressPanel;


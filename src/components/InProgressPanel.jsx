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

  return (
    <div id="inprg-panel" style={{ display: 'flex' }}>
      <div className="inprg-header">
        <h3>Task In Progress</h3>
        <div>
          <button className="btn-close" title="Close" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="inprg-body">
        <div className="inprg-row">
          <strong className="title">{task.title || 'Untitled'}</strong>
          <span className="badge priority">{task.priority || 'medium'}</span>
        </div>
        <div className="inprg-row meta">
          <strong>Assigned AI Agent:</strong> <span className="agent">{task.assignedAgent || 'Unknown'}</span>
        </div>
        <div className="inprg-row">
          <strong>Description</strong>
          <div className="desc" style={{ marginTop: '8px' }}>
            {task.description || 'No description'}
          </div>
        </div>
        <div className="inprg-row">
          <strong>AI Thinking Process</strong>
          <div 
            className="thinking" 
            aria-live="polite"
            ref={thinkingRef}
          >
            {processText || 'No process log yet...'}
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
  );
};

export default InProgressPanel;


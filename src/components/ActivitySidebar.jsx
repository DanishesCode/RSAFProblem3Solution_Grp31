import React from 'react';

const ActivitySidebar = ({ isOpen, onClose, activities }) => {
  return (
    <div id="activity-sidebar" className={`activity-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="activity-header">
        <h2>Live Activity</h2>
        <button id="close-activity" onClick={onClose}>✕</button>
      </div>

      <div id="activity-content" className="activity-content">
        {activities.length === 0 ? (
          <p style={{ color: '#666', fontSize: '14px' }}>No activity yet</p>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="activity-entry">
              <div className="activity-entry-title">{activity.title || 'Untitled Task'}</div>
              <small>Status: <b>{activity.status || 'Unknown'}</b></small><br />
              <small>Agent: {activity.agent || 'Unknown'}</small><br />
              <small>Priority: {activity.priority || 'medium'}</small><br />
              <small>Repo: {activity.repo || 'No repo'}</small><br />
              <small>Progress: {activity.percent || 0}%</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivitySidebar;


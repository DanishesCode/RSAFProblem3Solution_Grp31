import React from 'react';

const NotificationContainer = ({ notifications }) => {
  return (
    <div id="notification-container">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'success' ? '✓' : '⚠'}
          </div>
          <span>{notification.message}</span>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;


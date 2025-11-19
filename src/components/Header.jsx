import React from 'react';

const Header = () => {
  return (
    <header>
      <div className="brand" onClick={() => window.location.reload()}>
        <div className="logo">AI</div>
        <div>Agentic</div>
      </div>

      <div className="search-bar">
        <input type="text" placeholder="Search tasks..." />
      </div>

      <div className="top-buttons">
        <button className="btn-activity">Activity</button>
        <button className="btn-new">+ New Task</button>
      </div>
    </header>
  );
};

export default Header;
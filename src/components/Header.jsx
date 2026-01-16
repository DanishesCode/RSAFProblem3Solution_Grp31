import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterPanel from './FilterPanel';

const Header = ({ 
  onNewTask, 
  onActivityClick, 
  onFilterClick, 
  onSearchChange, 
  searchQuery,
  isFilterOpen,
  onFilterChange,
  tasks,
  repos,
  onSettingsClick
}) => {
  const navigate = useNavigate();

  return (
    <header>
      <div className="brand" onClick={() => navigate('/')}>
        <div className="logo">AI</div>
        <div>
          Agentic
          {tasks && tasks.length > 0 && (
            <span className="task-total-text"> {tasks.length} tasks in total</span>
          )}
        </div>
      </div>

      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Search tasks..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="search-actions">
          <button className="btn-filter" onClick={onFilterClick}>Filter</button>
          <button 
            className="btn-dashboard" 
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <FilterPanel
          tasks={tasks}
          onClose={onFilterClick}
          onFilterChange={onFilterChange}
        />
      )}

      <div className="top-buttons">
        <button className="btn-activity" onClick={onActivityClick}>Activity</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-new" onClick={onNewTask}>+ New Task</button>
          {onSettingsClick && (
            <button 
              className="btn-settings" 
              onClick={onSettingsClick}
              title="Settings"
              aria-label="Settings"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

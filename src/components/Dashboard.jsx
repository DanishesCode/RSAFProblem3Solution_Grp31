import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { initializeLogs } from '../services/api';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend);


const Dashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    repository: new Set(),
    aiAgent: new Set(),
    priority: new Set()
  });
  const [filterText, setFilterText] = useState('None');
  const [repoSearch, setRepoSearch] = useState('');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          navigate('/login', { replace: true });
          return;
        }
        const userLogs = await initializeLogs(userId);
        setLogs(userLogs);
        setFilteredLogs(userLogs);
      } catch (error) {
        console.error('Error loading logs:', error);
      }
    };
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const repos = React.useMemo(() => {
    const reposString = localStorage.getItem('repos');
    return reposString ? reposString.split(',').filter(Boolean) : [];
  }, []);

  const filteredRepos = React.useMemo(() => {
    if (!repoSearch) return repos;
    return repos.filter(repo => 
      repo.toLowerCase().includes(repoSearch.toLowerCase())
    );
  }, [repos, repoSearch]);

  const handleFilterToggle = (type, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      const filterSet = new Set(newFilters[type]);
      if (filterSet.has(value)) {
        filterSet.delete(value);
      } else {
        filterSet.add(value);
      }
      newFilters[type] = filterSet;
      return newFilters;
    });
  };

  const handleApplyFilters = () => {
    const filtered = logs.filter(log => {
      if (selectedFilters.repository.size && !selectedFilters.repository.has(log.repo)) return false;
      const agentName = log.assignedAgent || log.agentName || '';
      if (selectedFilters.aiAgent.size && !selectedFilters.aiAgent.has(agentName)) return false;
      if (selectedFilters.priority.size && !selectedFilters.priority.has(log.priority)) return false;
      return true;
    });

    setFilteredLogs(filtered);
    
    const filterTexts = [];
    if (selectedFilters.repository.size) {
      filterTexts.push(`Repository: ${[...selectedFilters.repository].join(', ')}`);
    }
    if (selectedFilters.aiAgent.size) {
      filterTexts.push(`AI Agent: ${[...selectedFilters.aiAgent].join(', ')}`);
    }
    if (selectedFilters.priority.size) {
      filterTexts.push(`Priority: ${[...selectedFilters.priority].join(', ')}`);
    }

    setFilterText(filterTexts.length > 0 ? filterTexts.join(' | ') : 'None');
    setIsSidebarOpen(false);
  };

  const counts = React.useMemo(() => {
    const c = { toDo: 0, progress: 0, review: 0, done: 0, cancel: 0 };
    filteredLogs.forEach(log => {
      if (log.status === 'toDo') c.toDo++;
      else if (log.status === 'progress') c.progress++;
      else if (log.status === 'review') c.review++;
      else if (log.status === 'done') c.done++;
      else if (log.status === 'cancel') c.cancel++;
    });
    return c;
  }, [filteredLogs]);

  const totalCount = counts.toDo + counts.progress + counts.review + counts.done + counts.cancel;

  const chartData = {
    labels: ['To-Do', 'In Progress', 'In Review', 'Done', 'Cancelled'],
    datasets: [{
      data: [counts.toDo, counts.progress, counts.review, counts.done, counts.cancel],
      backgroundColor: ['#4D4D5B', '#1D27DA', '#181FAA', '#15D94A', '#F71E21'],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    cutout: '60%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    }
  };

  return (
    <div className="dashboard-container">
      <header className="top">
        <button className="filters" onClick={() => setIsSidebarOpen(true)}>
          Filters
        </button>
        <div className="title-wrap">
          <h1 className="title">Dashboard</h1>
          <div className="subtitle">Filters: {filterText}</div>
        </div>
      </header>

      <main className="main">
        <div className="chart-area">
          <div id="chart-container">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="center-label">
              <div className="count">{totalCount}</div>
              <div className="count-sub">Total Tasks</div>
            </div>
          </div>

          <div className="legend">
            <div className="legend-item">
              <span className="swatch swatch-todo"></span>To-Do
            </div>
            <div className="legend-item">
              <span className="swatch swatch-progress"></span>In Progress
            </div>
            <div className="legend-item">
              <span className="swatch swatch-review"></span>In Review
            </div>
            <div className="legend-item">
              <span className="swatch swatch-done"></span>Done
            </div>
            <div className="legend-item">
              <span className="swatch swatch-cancel"></span>Cancelled
            </div>
          </div>
        </div>

        <div className="back-btn-wrap">
          <button className="back" onClick={() => navigate('/')}>
            Back to main page
          </button>
        </div>

        <div className={`filter-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <span className="close-btn" onClick={() => setIsSidebarOpen(false)}>X</span>
          
          <div className="filter-section">
            <h3>Repository</h3>
            <input
              type="text"
              placeholder="Search"
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
            />
            <div className="scrollable">
              {filteredRepos.map(repo => (
                <button
                  key={repo}
                  value={repo}
                  className={selectedFilters.repository.has(repo) ? 'selected' : ''}
                  onClick={() => handleFilterToggle('repository', repo)}
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Ai Agent</h3>
            <button
              value="Claude"
              className={selectedFilters.aiAgent.has('Claude') ? 'selected' : ''}
              onClick={() => handleFilterToggle('aiAgent', 'Claude')}
            >
              Claude Ai
            </button>
            <button
              value="OpenAI"
              className={selectedFilters.aiAgent.has('OpenAI') ? 'selected' : ''}
              onClick={() => handleFilterToggle('aiAgent', 'OpenAI')}
            >
              OpenAi
            </button>
            <button
              value="Gemini"
              className={selectedFilters.aiAgent.has('Gemini') ? 'selected' : ''}
              onClick={() => handleFilterToggle('aiAgent', 'Gemini')}
            >
              Gemini Ai
            </button>
          </div>

          <div className="filter-section">
            <h3>Priority</h3>
            <button
              value="high"
              className={selectedFilters.priority.has('high') ? 'selected' : ''}
              onClick={() => handleFilterToggle('priority', 'high')}
            >
              high
            </button>
            <button
              value="medium"
              className={selectedFilters.priority.has('medium') ? 'selected' : ''}
              onClick={() => handleFilterToggle('priority', 'medium')}
            >
              medium
            </button>
            <button
              value="low"
              className={selectedFilters.priority.has('low') ? 'selected' : ''}
              onClick={() => handleFilterToggle('priority', 'low')}
            >
              low
            </button>
          </div>

          <button className="apply-btn" onClick={handleApplyFilters}>
            Apply
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;


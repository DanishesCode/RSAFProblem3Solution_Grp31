import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { initializeLogs } from '../services/api';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale);


const Dashboard = () => {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'activity'
  const [selectedFilters, setSelectedFilters] = useState({
    taskOwner: new Set(),
    aiAgent: new Set(),
    priority: new Set()
  });
  const [filterText, setFilterText] = useState('None');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [agentStats, setAgentStats] = useState({});
  const [ownerStats, setOwnerStats] = useState({});

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          navigate('/login', { replace: true });
          return;
        }
        const userLogs = await initializeLogs(userId, boardId);
        setLogs(userLogs);
        setFilteredLogs(userLogs);
        // Reset filters when board changes
        setSelectedFilters({
          taskOwner: new Set(),
          aiAgent: new Set(),
          priority: new Set()
        });
        setFilterText('None');
      } catch (error) {
        console.error('Error loading logs:', error);
      }
    };
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]); // Re-run if boardId changes

  const repos = React.useMemo(() => {
    const reposString = localStorage.getItem('repos');
    return reposString ? reposString.split(',').filter(Boolean) : [];
  }, []);

  const owners = React.useMemo(() => {
    const ownerMap = new Map(); // Store { ownerId: ownerName } mapping
    logs.forEach(log => {
      if (log.ownerId) {
        if (!ownerMap.has(log.ownerId)) {
          ownerMap.set(log.ownerId, log.ownerName || log.ownerId);
        }
      }
    });
    return Array.from(ownerMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filteredOwners = React.useMemo(() => {
    if (!ownerSearch) return owners;
    return owners.filter(([id, name]) => 
      name.toLowerCase().includes(ownerSearch.toLowerCase())
    );
  }, [owners, ownerSearch]);

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
      if (selectedFilters.taskOwner.size && !selectedFilters.taskOwner.has(log.ownerId)) return false;
      const agentName = log.assignedAgent || log.agentName || '';
      if (selectedFilters.aiAgent.size && !selectedFilters.aiAgent.has(agentName)) return false;
      if (selectedFilters.priority.size && !selectedFilters.priority.has(log.priority)) return false;
      return true;
    });

    setFilteredLogs(filtered);
    
    const filterTexts = [];
    if (selectedFilters.taskOwner.size) {
      filterTexts.push(`Owner: ${[...selectedFilters.taskOwner].join(', ')}`);
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
    const agents = {};
    const owners = {};
    const priorities = { high: 0, medium: 0, low: 0 };
    
    filteredLogs.forEach(log => {
      if (log.status === 'toDo') c.toDo++;
      else if (log.status === 'progress') c.progress++;
      else if (log.status === 'review') c.review++;
      else if (log.status === 'done') c.done++;
      else if (log.status === 'cancel') c.cancel++;
      
      const agentName = log.assignedAgent || log.agentName || 'Unknown';
      agents[agentName] = (agents[agentName] || 0) + 1;
      
      const ownerName = log.ownerId || 'Unknown';
      owners[ownerName] = (owners[ownerName] || 0) + 1;
      
      if (log.priority === 'high') priorities.high++;
      else if (log.priority === 'medium') priorities.medium++;
      else if (log.priority === 'low') priorities.low++;
    });
    
    setAgentStats(agents);
    setOwnerStats(owners);
    c.priorities = priorities;
    return c;
  }, [filteredLogs]);

  const totalCount = counts.toDo + counts.progress + counts.review + counts.done + counts.cancel;
  const completionRate = totalCount > 0 ? Math.round((counts.done / totalCount) * 100) : 0;
  const completedTasks = counts.done + counts.cancel;
  
  // Additional statistics
  const topContributor = Object.entries(ownerStats).length > 0 
    ? Object.entries(ownerStats).reduce((max, [owner, count]) => count > max.count ? {owner, count} : max, {owner: 'N/A', count: 0})
    : {owner: 'N/A', count: 0};
    
  const topAgent = Object.entries(agentStats).length > 0
    ? Object.entries(agentStats).reduce((max, [agent, count]) => count > max.count ? {agent, count} : max, {agent: 'N/A', count: 0})
    : {agent: 'N/A', count: 0};

  const avgTasksPerOwner = Object.keys(ownerStats).length > 0 
    ? Math.round(totalCount / Object.keys(ownerStats).length)
    : 0;

  // Contribution activity data - calculate daily activity
  const contributionData = React.useMemo(() => {
    const dailyStats = {};
    const ownerDailyStats = {};
    
    // Get last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    filteredLogs.forEach(log => {
      const taskDate = log.createdAt ? new Date(log.createdAt.toDate ? log.createdAt.toDate() : log.createdAt) : new Date();
      const dateStr = taskDate.toISOString().split('T')[0];
      
      if (taskDate >= thirtyDaysAgo && taskDate <= today) {
        // Daily total activity
        dailyStats[dateStr] = (dailyStats[dateStr] || 0) + 1;
        
        // Per-owner daily activity
        const owner = log.ownerId || 'Unknown';
        if (!ownerDailyStats[owner]) ownerDailyStats[owner] = {};
        ownerDailyStats[owner][dateStr] = (ownerDailyStats[owner][dateStr] || 0) + 1;
      }
    });

    // Generate date range
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      dates.push({ date: dateStr, count: dailyStats[dateStr] || 0 });
    }

    return { 
      dailyActivity: dates, 
      ownerDailyActivity: ownerDailyStats 
    };
  }, [filteredLogs]);

  // Line chart for activity over time
  const activityChartData = {
    labels: contributionData.dailyActivity.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [{
      label: 'Tasks Created',
      data: contributionData.dailyActivity.map(d => d.count),
      borderColor: '#C9B59C',
      backgroundColor: 'rgba(201, 181, 156, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: '#C9B59C',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }]
  };

  const activityChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#222', font: { weight: '600' } }
      },
      tooltip: { enabled: true }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#666' },
        grid: { color: 'rgba(0,0,0,0.05)' }
      },
      x: {
        ticks: { color: '#666' },
        grid: { color: 'rgba(0,0,0,0.05)' }
      }
    }
  };

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
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="filters" onClick={() => setIsSidebarOpen(true)}>
          ⚙️ Filters
        </button>
        <div className="title-wrap">
          <h1 className="title">Task Dashboard</h1>
          <div className="subtitle">📊 {filterText}{boardId ? ` | Board: ${boardId}` : ''}</div>
        </div>
      </header>

      <main className="main">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
        <>
        {/* Summary Stats */}
        <div className="summary-stats">
          <div className="stat-card stat-total">
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card stat-done">
            <div className="stat-value">{counts.done}</div>
            <div className="stat-label">Completed</div>
            <div className="stat-rate">{completionRate}% Done</div>
          </div>
          <div className="stat-card stat-inprogress">
            <div className="stat-value">{counts.progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card stat-urgent">
            <div className="stat-value">{counts.priorities?.high || 0}</div>
            <div className="stat-label">High Priority</div>
          </div>
          <div className="stat-card stat-total">
            <div className="stat-value">{Object.keys(ownerStats).length}</div>
            <div className="stat-label">Contributors</div>
          </div>
          <div className="stat-card stat-total">
            <div className="stat-value">{avgTasksPerOwner}</div>
            <div className="stat-label">Avg Tasks/Owner</div>
          </div>
        </div>

        {/* Main Chart & Details Section */}
        <div className="chart-area">
          <div className="chart-wrapper">
            <div id="chart-container">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="center-label">
                <div className="count">{totalCount}</div>
                <div className="count-sub">Total Tasks</div>
              </div>
            </div>

            <div className="legend">
              <h3 className="legend-title">Status Breakdown</h3>
              <div className="legend-item">
                <span className="swatch swatch-todo"></span>
                <span className="legend-text">To-Do</span>
                <span className="legend-count">{counts.toDo}</span>
              </div>
              <div className="legend-item">
                <span className="swatch swatch-progress"></span>
                <span className="legend-text">In Progress</span>
                <span className="legend-count">{counts.progress}</span>
              </div>
              <div className="legend-item">
                <span className="swatch swatch-review"></span>
                <span className="legend-text">In Review</span>
                <span className="legend-count">{counts.review}</span>
              </div>
              <div className="legend-item">
                <span className="swatch swatch-done"></span>
                <span className="legend-text">Done</span>
                <span className="legend-count">{counts.done}</span>
              </div>
              <div className="legend-item">
                <span className="swatch swatch-cancel"></span>
                <span className="legend-text">Cancelled</span>
                <span className="legend-count">{counts.cancel}</span>
              </div>
            </div>
          </div>

          {/* Agent & Priority Stats */}
          <div className="details-section">
            <div className="detail-card">
              <h3 className="detail-title">� Task Contributors</h3>
              <div className="agent-list">
                {Object.entries(ownerStats).length > 0 ? (
                  Object.entries(ownerStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([owner, count]) => (
                      <div key={owner} className="agent-item">
                        <span className="agent-name">{owner}</span>
                        <span className="agent-count">{count}</span>
                      </div>
                    ))
                ) : (
                  <p className="empty-state">No contributors</p>
                )}
              </div>
            </div>

            <div className="detail-card">
              <h3 className="detail-title">📌 AI Agent Distribution</h3>
              <div className="agent-list">
                {Object.entries(agentStats).length > 0 ? (
                  Object.entries(agentStats)
                    .sort(([, a], [, b]) => b - a)
                    .map(([agent, count]) => (
                    <div key={agent} className="agent-item">
                      <span className="agent-name">{agent}</span>
                      <span className="agent-count">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No tasks assigned</p>
                )}
              </div>
            </div>

            <div className="detail-card">
              <h3 className="detail-title">📈 Priority Distribution</h3>
              <div className="priority-list">
                <div className="priority-item high">
                  <span>🔴 High</span>
                  <span className="priority-count">{counts.priorities?.high || 0}</span>
                </div>
                <div className="priority-item medium">
                  <span>🟡 Medium</span>
                  <span className="priority-count">{counts.priorities?.medium || 0}</span>
                </div>
                <div className="priority-item low">
                  <span>🟢 Low</span>
                  <span className="priority-count">{counts.priorities?.low || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights Section */}
        <div className="insights-section">
          <h2 className="insights-title">🎯 Quick Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">👑</div>
              <div className="insight-content">
                <div className="insight-label">Top Contributor</div>
                <div className="insight-value">{topContributor.owner}</div>
                <div className="insight-detail">{topContributor.count} tasks</div>
              </div>
            </div>
            
            <div className="insight-card">
              <div className="insight-icon">🤖</div>
              <div className="insight-content">
                <div className="insight-label">Most Used Agent</div>
                <div className="insight-value">{topAgent.agent}</div>
                <div className="insight-detail">{topAgent.count} tasks</div>
              </div>
            </div>
            
            <div className="insight-card">
              <div className="insight-icon">📊</div>
              <div className="insight-content">
                <div className="insight-label">Active Contributors</div>
                <div className="insight-value">{Object.keys(ownerStats).length}</div>
                <div className="insight-detail">Team size</div>
              </div>
            </div>
            
            <div className="insight-card">
              <div className="insight-icon">⚡</div>
              <div className="insight-content">
                <div className="insight-label">Pending Tasks</div>
                <div className="insight-value">{counts.toDo + counts.progress}</div>
                <div className="insight-detail">To complete</div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
        <>

        {/* Contribution Activity Chart */}
        <div className="contribution-section">
          <h2 className="contribution-title">📊 Activity Timeline (Last 30 Days)</h2>
          <div className="activity-chart-wrapper">
            <div className="activity-chart-container">
              <Line data={activityChartData} options={activityChartOptions} />
            </div>
          </div>
        </div>

        {/* Contribution Heatmap */}
        <div className="contribution-section">
          <h2 className="contribution-title">🔥 Contribution Heatmap</h2>
          <div className="heatmap-wrapper">
            <div className="heatmap-container">
              <div className="heatmap-legend">
                <span className="heatmap-label">Less</span>
                <div className="heatmap-scale">
                  <div className="heatmap-box" style={{ opacity: 0.1 }}></div>
                  <div className="heatmap-box" style={{ opacity: 0.4 }}></div>
                  <div className="heatmap-box" style={{ opacity: 0.7 }}></div>
                  <div className="heatmap-box" style={{ opacity: 1 }}></div>
                </div>
                <span className="heatmap-label">More</span>
              </div>

              <div className="heatmap-data">
                {Object.entries(contributionData.ownerDailyActivity).length > 0 ? (
                  Object.entries(contributionData.ownerDailyActivity).map(([owner, dailyData]) => (
                    <div key={owner} className="heatmap-row">
                      <div className="heatmap-owner">{owner}</div>
                      <div className="heatmap-cells">
                        {contributionData.dailyActivity.map((day) => {
                          const count = dailyData[day.date] || 0;
                          const maxCount = Math.max(1, Math.max(...Object.values(dailyData)));
                          const intensity = maxCount > 0 ? count / maxCount : 0;
                          
                          return (
                            <div
                              key={day.date}
                              className="heatmap-cell"
                              style={{
                                backgroundColor: `rgba(201, 181, 156, ${intensity})`,
                                borderColor: intensity > 0 ? '#999' : '#ddd'
                              }}
                              title={`${owner} - ${day.date}: ${count} task${count !== 1 ? 's' : ''}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">No contribution data available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="dashboard-nav">
          {activeTab === 'overview' && (
            <>
              <button className="nav-btn nav-left" onClick={() => navigate(-1)}>
                ← Back to Board
              </button>
              <button className="nav-btn nav-right" onClick={() => setActiveTab('activity')}>
                Activity & Contribution →
              </button>
            </>
          )}
          {activeTab === 'activity' && (
            <>
              <div className="nav-buttons-left">
                <button className="nav-btn nav-left" onClick={() => navigate(-1)}>
                  ← Back to Board
                </button>
                <button className="nav-btn nav-secondary" onClick={() => setActiveTab('overview')}>
                  ← Back to Overview
                </button>
              </div>
            </>
          )}
        </div>
        )}

        <div className="back-btn-wrap">
          <button className="back" onClick={() => navigate('/')}>
            ← Back to main page
          </button>
        </div>

        <div className={`filter-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <span className="close-btn" onClick={() => setIsSidebarOpen(false)}>×</span>
          
          <div className="filter-section">
            <h3>Task Owner</h3>
            <input
              type="text"
              placeholder="Search"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
            />
            <div className="scrollable">
              {filteredOwners.map(([ownerId, ownerName]) => (
                <button
                  key={ownerId}
                  value={ownerId}
                  className={selectedFilters.taskOwner.has(ownerId) ? 'selected' : ''}
                  onClick={() => handleFilterToggle('taskOwner', ownerId)}
                >
                  {ownerName}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Ai Agent</h3>
            <button
              value="DeepSeek"
              className={selectedFilters.aiAgent.has('DeepSeek') ? 'selected' : ''}
              onClick={() => handleFilterToggle('aiAgent', 'DeepSeek')}
            >
              DeepSeek Ai
            </button>
            <button
              value="GPT_OSS"
              className={selectedFilters.aiAgent.has('GPT_OSS') ? 'selected' : ''}
              onClick={() => handleFilterToggle('aiAgent', 'GPT_OSS')}
            >
              GPT_OSS Ai
            </button>
            <button
              value="Gemma"
              className={selectedFilters.aiAgent.has('Gemma') ? 'selected' : ''}
              onClick={() => handleFilterToggle('aiAgent', 'Gemma')}
            >
              Gemma Ai
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
            Apply Filters
          </button>
        </div>
        </>
        )}

      </main>
    </div>
  );
};

export default Dashboard;


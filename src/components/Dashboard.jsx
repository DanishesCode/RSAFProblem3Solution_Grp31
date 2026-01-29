import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { initializeLogs } from "../services/api";
import "./Dashboard.css";

ChartJS.register(ArcElement, Tooltip, Legend);

/* =======================
   Date parsing (robust)
======================= */
function parseMaybeDate(value) {
  if (!value) return null;

  // Firestore Timestamp (web SDK / admin)
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
    if (typeof value._seconds === "number") return new Date(value._seconds * 1000);
  }

  // Milliseconds
  if (typeof value === "number") return new Date(value);

  // String
  if (typeof value === "string") {
    // Try native parse
    const d1 = new Date(value);
    if (!Number.isNaN(d1.getTime())) return d1;

    // Handle: "28 January 2026 at 19:04:16 UTC+8"
    const cleaned = value
      .replace(" at ", " ")
      .replace(/UTC\+(\d{1,2})/i, (_, h) => `GMT+${String(h).padStart(2, "0")}00`)
      .replace(/UTC-(\d{1,2})/i, (_, h) => `GMT-${String(h).padStart(2, "0")}00`);

    const d2 = new Date(cleaned);
    if (!Number.isNaN(d2.getTime())) return d2;
  }

  return null;
}

function formatDateTime(d) {
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);

  const [githubNameById, setGithubNameById] = useState({});

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [filterText, setFilterText] = useState("None");

  const [selectedFilters, setSelectedFilters] = useState({
    owner: new Set(),
    aiAgent: new Set(),
    priority: new Set(),
  });
  const [filterText, setFilterText] = useState('None');
  const [repoSearch, setRepoSearch] = useState('');
  const [agentStats, setAgentStats] = useState({});

  /* =======================
     Initial load
  ======================= */
  useEffect(() => {
    const load = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        // Load tasks
        const userLogs = await initializeLogs(userId);
        setLogs(userLogs);
        setFilteredLogs(userLogs);

        // Load users (githubId -> githubName)
        const res = await fetch("/users");
        if (res.ok) {
          const users = await res.json();
          const map = {};
          for (const u of users) {
            if (u?.githubId && u?.githubName) {
              map[String(u.githubId)] = String(u.githubName);
            }
          }
          setGithubNameById(map);
        } else {
          console.warn("GET /users failed:", res.status);
        }
      } catch (e) {
        console.error("Dashboard load error:", e);
      }
    };

    load();
  }, [navigate]);

  /* =======================
     Helpers
  ======================= */
  const displayOwner = (ownerId) => {
    const id = ownerId ? String(ownerId) : "Unknown";
    return githubNameById[id] || id;
  };

  const handleFilterToggle = (type, value) => {
    setSelectedFilters((prev) => {
      const next = { ...prev };
      const s = new Set(next[type]);
      s.has(value) ? s.delete(value) : s.add(value);
      next[type] = s;
      return next;
    });
  };

  /* =======================
     Owner list for filter
  ======================= */
  const allOwnerIds = useMemo(() => {
    const s = new Set();
    logs.forEach((l) => l?.ownerId && s.add(String(l.ownerId)));
    return Array.from(s).sort();
  }, [logs]);

  const filteredOwnerIds = useMemo(() => {
    if (!ownerSearch) return allOwnerIds;
    const q = ownerSearch.toLowerCase();
    return allOwnerIds.filter((id) => {
      const name = (githubNameById[id] || "").toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }, [allOwnerIds, ownerSearch, githubNameById]);

  /* =======================
     Apply filters
  ======================= */
  const handleApplyFilters = () => {
    const next = logs.filter((l) => {
      const ownerId = String(l.ownerId || "");
      const agent = l.assignedAgent || l.agentName || "";
      const priority = l.priority || "";

      if (selectedFilters.owner.size && !selectedFilters.owner.has(ownerId)) return false;
      if (selectedFilters.aiAgent.size && !selectedFilters.aiAgent.has(agent)) return false;
      if (selectedFilters.priority.size && !selectedFilters.priority.has(priority)) return false;

      return true;
    });

    setFilteredLogs(next);

    const parts = [];
    if (selectedFilters.owner.size)
      parts.push(`Owner: ${[...selectedFilters.owner].map(displayOwner).join(", ")}`);
    if (selectedFilters.aiAgent.size)
      parts.push(`AI Agent: ${[...selectedFilters.aiAgent].join(", ")}`);
    if (selectedFilters.priority.size)
      parts.push(`Priority: ${[...selectedFilters.priority].join(", ")}`);

    setFilterText(parts.length ? parts.join(" | ") : "None");
    setIsSidebarOpen(false);
  };

  /* =======================
     Status counts
  ======================= */
  const counts = useMemo(() => {
    const c = { toDo: 0, progress: 0, review: 0, done: 0, cancel: 0 };
    filteredLogs.forEach((l) => {
      if (l.status === "toDo") c.toDo++;
      else if (l.status === "progress") c.progress++;
      else if (l.status === "review") c.review++;
      else if (l.status === "done") c.done++;
      else if (l.status === "cancel") c.cancel++;
    const agents = {};
    const priorities = { high: 0, medium: 0, low: 0 };
    
    filteredLogs.forEach(log => {
      if (log.status === 'toDo') c.toDo++;
      else if (log.status === 'progress') c.progress++;
      else if (log.status === 'review') c.review++;
      else if (log.status === 'done') c.done++;
      else if (log.status === 'cancel') c.cancel++;
      
      const agentName = log.assignedAgent || log.agentName || 'Unknown';
      agents[agentName] = (agents[agentName] || 0) + 1;
      
      if (log.priority === 'high') priorities.high++;
      else if (log.priority === 'medium') priorities.medium++;
      else if (log.priority === 'low') priorities.low++;
    });
    
    setAgentStats(agents);
    c.priorities = priorities;
    return c;
  }, [filteredLogs]);

  const totalCount =
    counts.toDo + counts.progress + counts.review + counts.done + counts.cancel;
  const totalCount = counts.toDo + counts.progress + counts.review + counts.done + counts.cancel;
  const completionRate = totalCount > 0 ? Math.round((counts.done / totalCount) * 100) : 0;
  const completedTasks = counts.done + counts.cancel;

  /* =======================
     Chart
  ======================= */
  const chartData = {
    labels: ["To-Do", "In Progress", "In Review", "Done", "Cancelled"],
    datasets: [
      {
        data: [
          counts.toDo,
          counts.progress,
          counts.review,
          counts.done,
          counts.cancel,
        ],
        backgroundColor: [
          "#4D4D5B",
          "#1D27DA",
          "#181FAA",
          "#15D94A",
          "#F71E21",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  /* =======================
     Stats (most important)
  ======================= */
  const stats = useMemo(() => {
    let latest = null;
    const byOwner = new Map();

    filteredLogs.forEach((l) => {
      const ownerId = String(l.ownerId || "Unknown");
      const d =
        parseMaybeDate(l.updatedAt) || parseMaybeDate(l.createdAt);

      if (d && (!latest || d > latest)) latest = d;

      if (!byOwner.has(ownerId)) byOwner.set(ownerId, 0);
      byOwner.set(ownerId, byOwner.get(ownerId) + 1);
    });

    let topOwnerId = "—";
    let topCount = 0;
    for (const [id, count] of byOwner.entries()) {
      if (count > topCount) {
        topCount = count;
        topOwnerId = id;
      }
    }

    return {
      lastContribution: latest,
      topOwnerId,
      topOwnerName: displayOwner(topOwnerId),
      topCount,
      activeCount: totalCount - counts.done - counts.cancel,
      doneCount: counts.done,
    };
  }, [filteredLogs, githubNameById, counts, totalCount]);

  /* =======================
     Render
  ======================= */
  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <div className="dash-header-left">
          <button className="btn-dashboard" onClick={() => setIsSidebarOpen(true)}>
            Filters
          </button>
          <button className="btn-dashboard" onClick={() => navigate("/")}>
            Back
          </button>
        </div>

        <div className="dash-header-center">
          <h1 className="dash-title">Dashboard</h1>
          <div className="dash-subtitle">Filters: {filterText}</div>
      <header className="top">
        <button className="filters" onClick={() => setIsSidebarOpen(true)}>
          ⚙️ Filters
        </button>
        <div className="title-wrap">
          <h1 className="title">Task Dashboard</h1>
          <div className="subtitle">📊 {filterText}</div>
        </div>

        <div className="dash-header-right" />
      </header>

      <main className="dash-main">
        <section className="dash-grid">
          {/* LEFT */}
          <div className="chart-card">
            <div className="chart-wrap">
              <div className="chart-canvas">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
              <div className="center-label">
                <div className="count">{totalCount}</div>
                <div className="count-sub">Total Tasks</div>
              </div>
            </div>

            <div className="legend">
              {["todo","progress","review","done","cancel"].map((_,i)=>null)}
              <div className="legend-item"><span className="swatch swatch-todo"/> To-Do</div>
              <div className="legend-item"><span className="swatch swatch-progress"/> In Progress</div>
              <div className="legend-item"><span className="swatch swatch-review"/> In Review</div>
              <div className="legend-item"><span className="swatch swatch-done"/> Done</div>
              <div className="legend-item"><span className="swatch swatch-cancel"/> Cancelled</div>
            </div>
      <main className="main">
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
        </div>

          {/* RIGHT */}
          <div className="stats-grid-small">
            <div className="stat-card small">
              <div className="stat-label">Total Tasks</div>
              <div className="stat-value">{totalCount}</div>
            </div>

            <div className="stat-card small">
              <div className="stat-label">Active Tasks</div>
              <div className="stat-value">{stats.activeCount}</div>
            </div>

            <div className="stat-card small">
              <div className="stat-label">Done</div>
              <div className="stat-value">{stats.doneCount}</div>
            </div>

            <div className="stat-card small">
              <div className="stat-label">Most Contributions</div>
              <div className="stat-value smallText">
                {stats.topOwnerName} ({stats.topCount})
              </div>
            </div>

            <div className="stat-card wide">
              <div className="stat-label">Last Contribution</div>
              <div className="stat-value smallText">
                {formatDateTime(stats.lastContribution)}
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <div className={`filter-sidebar ${isSidebarOpen ? "open" : ""}`}>
          <span className="close-btn" onClick={() => setIsSidebarOpen(false)}>X</span>

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
              <h3 className="detail-title">📌 AI Agent Distribution</h3>
              <div className="agent-list">
                {Object.entries(agentStats).length > 0 ? (
                  Object.entries(agentStats).map(([agent, count]) => (
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
              placeholder="Search by name or id"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
            />
            <div className="scrollable">
              {filteredOwnerIds.map((id) => (
                <button
                  key={id}
                  className={selectedFilters.owner.has(id) ? "selected" : ""}
                  onClick={() => handleFilterToggle("owner", id)}
                >
                  {displayOwner(id)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>AI Agent</h3>
            {["DeepSeek", "GPT_OSS", "Gemma"].map((a) => (
              <button
                key={a}
                className={selectedFilters.aiAgent.has(a) ? "selected" : ""}
                onClick={() => handleFilterToggle("aiAgent", a)}
              >
                {a}
              </button>
            ))}
          </div>

          <div className="filter-section">
            <h3>Priority</h3>
            {["high", "medium", "low"].map((p) => (
              <button
                key={p}
                className={selectedFilters.priority.has(p) ? "selected" : ""}
                onClick={() => handleFilterToggle("priority", p)}
              >
                {p}
              </button>
            ))}
          </div>

          <button className="apply-btn" onClick={handleApplyFilters}>
            Apply Filters
          </button>
        </div>
      </main>
    </div>
  );
}

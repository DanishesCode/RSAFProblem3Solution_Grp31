// src/pages/MyCollabs.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyCollabs.css";
import CreateCollabModal from "./CreateCollabModal";

export default function MyCollabs() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // demo data (replace later)
  const collabs = useMemo(
    () => [
      { id: 1, title: "Project One", repo: "Repo X", members: 3 },
      { id: 2, title: "Project One", repo: "Repo X", members: 3 },
      { id: 3, title: "Project Two", repo: "Repo X", members: 3 },
      { id: 4, title: "Project Three", repo: "Repo X", members: 3 },
      { id: 5, title: "Project Four", repo: "Repo Y", members: 4 },
      { id: 6, title: "Project Five", repo: "Repo Z", members: 2 },
      { id: 7, title: "Project Six", repo: "Repo A", members: 6 },
      { id: 8, title: "Project Seven", repo: "Repo B", members: 5 },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collabs;
    return collabs.filter((c) =>
      `${c.title} ${c.repo}`.toLowerCase().includes(q)
    );
  }, [collabs, query]);

  const collabId = localStorage.getItem("githubId");

  return (
    <div className="mc-page">
      {/* Top bar */}
      <header className="mc-topbar">
        <button className="mc-back" type="button" onClick={() => navigate(-1)}>
          <span className="mc-back-icon" aria-hidden="true">
            ‹
          </span>
          Back
        </button>

        <h1 className="mc-title">My Collaborations</h1>

        <div />
      </header>

      <div className="mc-rule" />

      {/* Search + ID */}
      <div className="mc-search-wrap">
        <input
          className="mc-search"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mc-collabid">Your Collab ID: {collabId}</div>
      </div>

      <main className="mc-scrollbox">
        <div className="mc-grid">
          {filtered.map((c) => (
            <button
              key={c.id}
              className="mc-card"
              type="button"
              onClick={() => navigate(`/collab/${c.id}`)}
            >
              <div className="mc-card-title">{c.title}</div>
              <div className="mc-card-sub">{c.repo}</div>
              <div className="mc-card-sub">{c.members} members</div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="mc-empty">No collaborations found.</div>
          )}
        </div>
      </main>

      <button
        className="mc-create"
        type="button"
        onClick={() => navigate("/create-collab-board")}
      >
        Create Board
      </button>
    </div>
  );
}

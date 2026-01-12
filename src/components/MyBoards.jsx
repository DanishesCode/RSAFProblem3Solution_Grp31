import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyBoards.css";

export default function MyBoards() {
  const navigate = useNavigate();

  // demo data (replace with API data)
  const boards = useMemo(
    () => [
      { id: 1, title: "Project One", repo: "Repo X", members: 3 },
      { id: 2, title: "Project One", repo: "Repo X", members: 3 },
      { id: 3, title: "Project One", repo: "Repo X", members: 3 },
      { id: 4, title: "Project One", repo: "Repo X", members: 3 },
      { id: 5, title: "Project Two", repo: "Repo Y", members: 5 },
      { id: 6, title: "Project Three", repo: "Repo Z", members: 2 },

      // add more to test scrolling
      // { id: 7, title: "Project Four", repo: "Repo A", members: 4 },
    ],
    []
  );

  const [query, setQuery] = useState("");

  const filteredBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;

    return boards.filter((b) => {
      const hay = `${b.title} ${b.repo}`.toLowerCase();
      return hay.includes(q);
    });
  }, [boards, query]);

  // ✅ only make container scrollable when there are 6+ items (after filtering)
  const shouldScroll = filteredBoards.length >= 6;

  return (
    <div className="myb-page">
      {/* Top bar */}
      <header className="myb-topbar">
        <button className="myb-back" type="button" onClick={() => navigate(-1)}>
          <span className="myb-back-icon" aria-hidden="true">
            ‹
          </span>
          Back
        </button>

        <h1 className="myb-title">My Boards</h1>

        <div />
      </header>

      <div className="myb-rule" />

      {/* Search */}
      <div className="myb-search-row">
        <input
          className="myb-search"
          type="text"
          placeholder="Search boards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Boards container */}
      <main className={`myb-list ${shouldScroll ? "is-scroll" : ""}`}>
        <div className="myb-grid">
          {filteredBoards.map((b) => (
            <button
              key={b.id}
              className="myb-card"
              type="button"
              onClick={() => navigate(`/board/${b.id}`)}
            >
              <div className="myb-card-title">{b.title}</div>
              <div className="myb-card-sub">{b.repo}</div>
              <div className="myb-card-sub">{b.members} members</div>
            </button>
          ))}

          {filteredBoards.length === 0 && (
            <div className="myb-empty">No boards found.</div>
          )}
        </div>
      </main>

      {/* Floating Create Board */}
      <button
        className="myb-create"
        type="button"
        onClick={() => navigate("/create-board")}
      >
        Create Board
      </button>
    </div>
  );
}

import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyBoards.css";
import CreateBoardModal from "./CreateBoardModal";

export default function MyBoards() {
  const navigate = useNavigate();

  const [boards, setBoards] = useState([
    { id: 1, title: "Project One", repo: "Repo X", members: 3 },
    { id: 2, title: "Project One", repo: "Repo X", members: 3 },
    { id: 3, title: "Project One", repo: "Repo X", members: 3 },
    { id: 4, title: "Project One", repo: "Repo X", members: 3 },
    { id: 5, title: "Project Two", repo: "Repo Y", members: 5 },
    { id: 6, title: "Project Three", repo: "Repo Z", members: 2 },
  ]);

  const [repos, setRepos] = useState([]);          // ✅ from localStorage
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // ✅ Load repos from localStorage key: "repos"
  useEffect(() => {
    const raw = localStorage.getItem("repos") || "";
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // optional: unique + sort
    const unique = Array.from(new Set(list));
    setRepos(unique);
  }, []);

  const filteredBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;

    return boards.filter((b) => {
      const hay = `${b.title} ${b.repo}`.toLowerCase();
      return hay.includes(q);
    });
  }, [boards, query]);

  // ✅ scroll based on total boards
  const shouldScroll = boards.length >= 6;

  const handleCreateBoard = (data) => {
    // data: { repo, name, members: [] }
    const newBoard = {
      id: Date.now(),
      title: data.name,
      repo: data.repo,
      members: (data.members?.length || 0) + 1,
    };

    setBoards((prev) => [newBoard, ...prev]);
    setIsCreateOpen(false);
  };

  return (
    <div className="myb-page">
      {/* Top bar */}
      <header className="myb-topbar">
        <button className="myb-back" type="button" onClick={() => navigate(-1)}>
          <span className="myb-back-icon" aria-hidden="true">‹</span>
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

      {/* Create Board button */}
      <button className="myb-create" type="button" onClick={() => setIsCreateOpen(true)}>
        Create Board
      </button>

      {/* ✅ Modal uses repos from localStorage */}
      <CreateBoardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        repos={repos}
        onCreate={handleCreateBoard}
      />
    </div>
  );
}

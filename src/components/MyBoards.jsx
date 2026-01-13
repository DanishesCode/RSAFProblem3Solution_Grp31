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

  const [repos, setRepos] = useState([]);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // ✅ Load repos from localStorage key: "repos" (comma-separated)
  useEffect(() => {
    const raw = localStorage.getItem("repos") || "";
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setRepos(Array.from(new Set(list)));
  }, []);

  const filteredBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;

    return boards.filter((b) => {
      const hay = `${b.title} ${b.repo}`.toLowerCase();
      return hay.includes(q);
    });
  }, [boards, query]);

  const shouldScroll = boards.length >= 6;

  // ✅ called by CreateBoardModal on "Create Board"
  const handleCreate = async (data) => {
    console.log("[MyBoards] Create modal submitted:", data);

    const ownerId =
      localStorage.getItem("userId") || localStorage.getItem("githubId");
    console.log("[MyBoards] ownerId from localStorage:", ownerId);

    const payload = {
      name: data.name,                 // from modal
      repo: data.repo,
      type: data.type || "personal",   // personal | collab (modal decides)
      ownerId,
      memberIds: data.members || [],
    };

    console.log("[MyBoards] Sending payload to backend:", payload);

    try {
      const res = await fetch("http://localhost:3000/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log("[MyBoards] Response status:", res.status);

      const json = await res.json().catch(() => null);
      console.log("[MyBoards] Response JSON:", json);

      if (!res.ok) {
        console.error("[MyBoards] Create board FAILED:", json);
        alert(`Create board failed: ${json?.error || "Unknown error"}`);
        return;
      }

      const created = {
        id: json.id,
        title: json.name,
        repo: json.repo,
        type: json.type,
        members: json.type === "collab" ? (json.memberIds?.length || 1) : 1,
      };

      console.log("[MyBoards] Board created OK:", created);

      setBoards((prev) => [created, ...prev]);
      setIsCreateOpen(false);
    } catch (err) {
      console.error("[MyBoards] Network/JS error creating board:", err);
      alert(`Create board error: ${err.message}`);
    }
  };

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
              <div className="myb-card-sub">
                {b.type === "personal" ? "Personal" : `${b.members} members`}
              </div>
            </button>
          ))}

          {filteredBoards.length === 0 && (
            <div className="myb-empty">No boards found.</div>
          )}
        </div>
      </main>

      {/* Create Board button */}
      <button
        className="myb-create"
        type="button"
        onClick={() => setIsCreateOpen(true)}
      >
        Create Board
      </button>

      {/* Modal */}
      <CreateBoardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        repos={repos}
        onCreate={handleCreate}   // ✅ fixed name
      />
    </div>
  );
}

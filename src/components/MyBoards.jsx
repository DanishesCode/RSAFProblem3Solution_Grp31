import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyBoards.css";
import CreateBoardModal from "./CreateBoardModal";

export default function MyBoards() {
  const navigate = useNavigate();

  // Load boards from localStorage on initial mount
  const [boards, setBoards] = useState(() => {
    try {
      const saved = localStorage.getItem("myBoards");
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("[MyBoards] Loaded boards from localStorage:", parsed);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn("[MyBoards] Failed to load boards from localStorage:", err);
    }
    return [];
  });

  const [repos, setRepos] = useState([]);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Save boards to localStorage whenever boards state changes
  useEffect(() => {
    try {
      localStorage.setItem("myBoards", JSON.stringify(boards));
      console.log("[MyBoards] Saved boards to localStorage:", boards.length, "boards");
    } catch (err) {
      console.warn("[MyBoards] Failed to save boards to localStorage:", err);
    }
  }, [boards]);

  // ✅ Load repos from localStorage key: "repos" (comma-separated)
  useEffect(() => {
    const raw = localStorage.getItem("repos") || "";
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setRepos(Array.from(new Set(list)));
  }, []);

  // ✅ Load personal boards from database
  useEffect(() => {
    const loadBoards = async () => {
      try {
        const userId = localStorage.getItem("userId") || localStorage.getItem("githubId");
        
        if (!userId) {
          console.warn("[MyBoards] No userId found in localStorage");
          setIsLoading(false);
          return;
        }

        console.log("[MyBoards] Loading personal boards for userId:", userId);

        const res = await fetch(`http://localhost:3000/users/${userId}/boards?type=personal`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Failed to load boards" }));
          console.error("[MyBoards] Failed to load boards:", error);
          setIsLoading(false);
          return;
        }

        const boardsData = await res.json();
        console.log("[MyBoards] Loaded boards:", boardsData);

        // Transform database format to component format
        const transformedBoards = boardsData.map((board) => ({
          id: board.id,
          boardId: board.id, // Explicitly save boardId for easy access
          title: board.name,
          repo: board.repo,
          type: board.type,
          members: board.type === "collab" ? (board.memberIds?.length || 1) : 1,
        }));

        setBoards(transformedBoards);
        // Boards will be automatically saved to localStorage via useEffect
      } catch (err) {
        console.error("[MyBoards] Error loading boards:", err);
        alert(`Failed to load boards: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadBoards();
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
        boardId: json.id, // Explicitly save boardId
        title: json.name,
        repo: json.repo,
        type: json.type,
        members: json.type === "collab" ? (json.memberIds?.length || 1) : 1,
      };

      console.log("[MyBoards] Board created OK:", created);

      // Only add to list if it's a personal board (since we're filtering for personal only)
      if (json.type === "personal") {
        setBoards((prev) => {
          const updated = [created, ...prev];
          // Updated boards will be automatically saved to localStorage via useEffect
          return updated;
        });
      }
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
          {isLoading ? (
            <div className="myb-empty">Loading boards...</div>
          ) : (
            <>
              {filteredBoards.map((b) => (
                <button
                  key={b.id}
                  className="myb-card"
                  type="button"
                  data-board-id={b.boardId || b.id}
                  onClick={() => {
                    const boardId = b.boardId || b.id;
                    // Save boardId to localStorage when clicked
                    try {
                      localStorage.setItem("selectedBoardId", boardId);
                      console.log("[MyBoards] Saved boardId to localStorage:", boardId);
                    } catch (err) {
                      console.warn("[MyBoards] Failed to save boardId to localStorage:", err);
                    }
                    navigate(`/board/${b.id}`);
                  }}
                >
                  <div className="myb-card-title">{b.title}</div>
                  <div className="myb-card-sub">Repo: {b.repo}</div>
                 
                </button>
              ))}

              {filteredBoards.length === 0 && !isLoading && (
                <div className="myb-empty">No personal boards found.</div>
              )}
            </>
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

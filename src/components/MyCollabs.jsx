// src/pages/MyCollabs.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyCollabs.css";
import CreateCollabBoardModal from "./CreateCollabBoardModal";

export default function MyCollabs() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [collabs, setCollabs] = useState([]);
  const [repos, setRepos] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load repos from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("repos") || "";
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setRepos(Array.from(new Set(list)));
  }, []);

  // Load collab boards from database
  useEffect(() => {
    const loadCollabs = async () => {
      try {
        const userId = localStorage.getItem("userId") || localStorage.getItem("githubId");
        
        if (!userId) {
          console.warn("[MyCollabs] No userId found in localStorage");
          setIsLoading(false);
          return;
        }

        console.log("[MyCollabs] Loading collab boards for userId:", userId);

        const res = await fetch(`http://localhost:3000/users/${userId}/boards?type=collab`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Failed to load collabs" }));
          console.error("[MyCollabs] Failed to load collabs:", error);
          setIsLoading(false);
          return;
        }

        const collabsData = await res.json();
        console.log("[MyCollabs] Loaded collabs:", collabsData);

        // Transform database format to component format
        const transformedCollabs = collabsData.map((board) => ({
          id: board.id,
          boardId: board.id,
          title: board.name,
          repo: board.repo,
          members: board.memberIds?.length || 1,
        }));

        setCollabs(transformedCollabs);
      } catch (err) {
        console.error("[MyCollabs] Error loading collabs:", err);
        alert(`Failed to load collaborations: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollabs();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collabs;
    return collabs.filter((c) =>
      `${c.title} ${c.repo}`.toLowerCase().includes(q)
    );
  }, [collabs, query]);

  const collabId = localStorage.getItem("githubId") || localStorage.getItem("userId");

  // Handle creating a new collab board
  const handleCreate = async (data) => {
    console.log("[MyCollabs] Create collab modal submitted:", data);

    const ownerId = localStorage.getItem("userId") || localStorage.getItem("githubId");
    console.log("[MyCollabs] ownerId from localStorage:", ownerId);

    // Convert member GitHub IDs to array (assuming they're entered as comma-separated or array)
    const memberIds = Array.isArray(data.members) 
      ? data.members 
      : typeof data.members === 'string' 
        ? data.members.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const payload = {
      name: data.name,
      repo: data.repo,
      type: "collab", // Always collab for this component
      ownerId,
      memberIds: memberIds, // Array of GitHub IDs
    };

    console.log("[MyCollabs] Sending payload to backend:", payload);

    try {
      const res = await fetch("http://localhost:3000/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      console.log("[MyCollabs] Response status:", res.status);

      const json = await res.json().catch(() => null);
      console.log("[MyCollabs] Response JSON:", json);

      if (!res.ok) {
        console.error("[MyCollabs] Create collab board FAILED:", json);
        alert(`Create collab board failed: ${json?.error || "Unknown error"}`);
        return;
      }

      const created = {
        id: json.id,
        boardId: json.id,
        title: json.name,
        repo: json.repo,
        members: json.memberIds?.length || 1,
      };

      console.log("[MyCollabs] Collab board created OK:", created);

      setCollabs((prev) => [created, ...prev]);
      setIsCreateOpen(false);
    } catch (err) {
      console.error("[MyCollabs] Network/JS error creating collab board:", err);
      alert(`Create collab board error: ${err.message}`);
    }
  };

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
          {isLoading ? (
            <div className="mc-empty">Loading collaborations...</div>
          ) : (
            <>
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className="mc-card"
                  type="button"
                  data-board-id={c.boardId || c.id}
                  onClick={() => {
                    const boardId = c.boardId || c.id;
                    // Save boardId to localStorage when clicked
                    try {
                      localStorage.setItem("selectedBoardId", boardId);
                      console.log("[MyCollabs] Saved boardId to localStorage:", boardId);
                    } catch (err) {
                      console.warn("[MyCollabs] Failed to save boardId to localStorage:", err);
                    }
                    navigate(`/collab/${c.id}`);
                  }}
                >
                  <div className="mc-card-title">{c.title}</div>
                  <div className="mc-card-sub">{c.repo}</div>
                  <div className="mc-card-sub">{c.members} members</div>
                </button>
              ))}

              {filtered.length === 0 && !isLoading && (
                <div className="mc-empty">No collaborations found.</div>
              )}
            </>
          )}
        </div>
      </main>

      <button
        className="mc-create"
        type="button"
        onClick={() => setIsCreateOpen(true)}
      >
        Create Board
      </button>

      {/* Modal */}
      <CreateCollabBoardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        repos={repos}
        onCreate={handleCreate}
      />
    </div>
  );
}

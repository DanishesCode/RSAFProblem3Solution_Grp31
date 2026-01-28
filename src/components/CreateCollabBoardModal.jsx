// src/components/CreateBoardModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./CreateBoardModal.css";

export default function CreateBoardModal({
  isOpen,
  onClose,
  onCreate,
  repos = [],
}) {
  const repoOptions = useMemo(() => repos.filter(Boolean), [repos]);

  const [selectedRepo, setSelectedRepo] = useState(repoOptions[0] || "");
  const [boardName, setBoardName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [team, setTeam] = useState([]); // array of GitHub IDs
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [repoSearch, setRepoSearch] = useState("");

  const filteredRepos = useMemo(() => {
    if (!repoSearch.trim()) return repoOptions;
    const term = repoSearch.toLowerCase();
    return repoOptions.filter((r) => r.toLowerCase().includes(term));
  }, [repoOptions, repoSearch]);

  // reset when opening
  useEffect(() => {
    if (!isOpen) return;
    setSelectedRepo(repoOptions[0] || "");
    setBoardName("");
    setInviteInput("");
    setTeam([]);
  }, [isOpen, repoOptions]);

  // close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateGitHubId = async (githubId) => {
    try {
      const res = await fetch(`http://localhost:3000/users/github/${githubId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (res.ok) {
        const user = await res.json();
        return { valid: true, user };
      } else {
        return { valid: false, error: 'User not found' };
      }
    } catch (error) {
      return { valid: false, error: 'Failed to validate GitHub ID' };
    }
  };

  const addInvite = async () => {
    const value = inviteInput.trim();
    if (!value) return;
    
    // Check if already in team
    if (team.includes(value)) {
      setErrorMessage('This GitHub ID is already in the team');
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    
    setIsValidating(true);
    setErrorMessage("");
    
    const validation = await validateGitHubId(value);
    setIsValidating(false);
    
    if (!validation.valid) {
      setErrorMessage(`Invalid GitHub ID: ${value}. User not found.`);
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    
    setTeam((prev) => [...prev, value]);
    setInviteInput("");
    setErrorMessage("");
  };

  const removeInvite = (value) => {
    setTeam((prev) => prev.filter((x) => x !== value));
  };

  const submit = async () => {
    const name = boardName.trim();
    if (!selectedRepo) return;
    if (!name) return;

    // Validate all team members before submitting
    if (team.length > 0) {
      setIsValidating(true);
      setErrorMessage("");
      
      const invalidIds = [];
      for (const githubId of team) {
        const validation = await validateGitHubId(githubId);
        if (!validation.valid) {
          invalidIds.push(githubId);
        }
      }
      
      setIsValidating(false);
      
      if (invalidIds.length > 0) {
        setErrorMessage(`Invalid GitHub IDs: ${invalidIds.join(', ')}. These users were not found.`);
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
    }

    onCreate?.({
      repo: selectedRepo,
      name,
      members: team,
    });
  };

  return (
    <div className="cbm-backdrop" onMouseDown={onClose}>
      <div
        className="cbm-modal"
        onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking inside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbm-title"
      >
        <h2 className="cbm-title" id="cbm-title">
          Create New Board
        </h2>

        {/* Select Repo */}
        <label className="cbm-label">Select Repo</label>
        <input
          className="cbm-input cbm-repo-search"
          type="text"
          placeholder="Search repos..."
          value={repoSearch}
          onChange={(e) => setRepoSearch(e.target.value)}
        />
        <select
          className="cbm-select"
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          {filteredRepos.length === 0 ? (
            <option value="">No repos match your search</option>
          ) : (
            filteredRepos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))
          )}
        </select>

        {/* Board name */}
        <label className="cbm-label">Board Name</label>
        <input
          className="cbm-input"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          placeholder=""
        />

        {/* Initial team */}
        <label className="cbm-label">Initial Team</label>
        <div className="cbm-invite-row">
          <input
            className="cbm-input"
            value={inviteInput}
            onChange={(e) => {
              setInviteInput(e.target.value);
              setErrorMessage("");
            }}
            placeholder="Add people by GitHub ID..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isValidating) {
                addInvite();
              }
            }}
            disabled={isValidating}
          />
          <button 
            className="cbm-invite-btn" 
            type="button" 
            onClick={addInvite}
            disabled={isValidating}
          >
            {isValidating ? "Validating..." : "Invite"}
          </button>
        </div>
        
        {errorMessage && (
          <div style={{ 
            color: '#d32f2f', 
            fontSize: '14px', 
            marginTop: '8px',
            padding: '8px',
            background: '#ffebee',
            borderRadius: '4px'
          }}>
            {errorMessage}
          </div>
        )}

        {/* chips */}
        {team.length > 0 && (
          <div className="cbm-chips">
            {team.map((m) => (
              <span key={m} className="cbm-chip">
                {m}
                <button
                  type="button"
                  className="cbm-chip-x"
                  onClick={() => removeInvite(m)}
                  aria-label={`Remove ${m}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* actions */}
        <div className="cbm-actions">
          <button className="cbm-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cbm-create"
            type="button"
            onClick={submit}
            disabled={!selectedRepo || !boardName.trim()}
            title={!boardName.trim() ? "Enter a board name" : ""}
          >
            Create Board
          </button>
        </div>
      </div>
    </div>
  );
}

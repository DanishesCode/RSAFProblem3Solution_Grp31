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
  const [team, setTeam] = useState([]); // array of emails/names

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

  const addInvite = () => {
    const value = inviteInput.trim();
    if (!value) return;
    setTeam((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setInviteInput("");
  };

  const removeInvite = (value) => {
    setTeam((prev) => prev.filter((x) => x !== value));
  };

  const submit = () => {
    const name = boardName.trim();
    if (!selectedRepo) return;
    if (!name) return;

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
        <select
          className="cbm-select"
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
        >
          {repoOptions.length === 0 ? (
            <option value="">No repos found</option>
          ) : (
            repoOptions.map((r) => (
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
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="Add people by GitHub ID (comma-separated)..."
            onKeyDown={(e) => {
              if (e.key === "Enter") addInvite();
            }}
          />
          <button className="cbm-invite-btn" type="button" onClick={addInvite}>
            Invite
          </button>
        </div>

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

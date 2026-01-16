import React, { useState } from "react";
import "./ManageMembersModal.css";

export default function ManageMembersModal({
  isOpen,
  onClose,
  onBack,
  members = [],
  userRole = null, // 'owner' or 'editor'
  onInviteMember,
  onRemoveMember
}) {
  const [inviteInput, setInviteInput] = useState("");

  if (!isOpen) return null;

  const canRemove = userRole === 'owner';
  const canInvite = userRole === 'owner' || userRole === 'editor';

  const handleInvite = () => {
    const githubId = inviteInput.trim();
    if (!githubId) return;
    
    if (onInviteMember) {
      onInviteMember(githubId);
      setInviteInput("");
    }
  };

  const handleRemove = (member) => {
    if (canRemove && onRemoveMember) {
      onRemoveMember(member);
    }
  };

  return (
    <div className="mm-overlay" onMouseDown={onClose}>
      <div
        className="mm-modal"
        onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking inside
        role="dialog"
        aria-modal="true"
        aria-label="Manage members"
      >
        <div className="mm-header">
          <h2 className="mm-title">
            Manage Members
            <span className="mm-subtitle">
              {" "}
              -{" "}
              <button type="button" className="mm-back" onClick={onBack}>
                Back Agent Dashboard
              </button>
            </span>
          </h2>
        </div>

        <div className="mm-body">
          {canInvite && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="mm-invite"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite();
                  }
                }}
                placeholder="Invite new members by GitHub ID..."
              />
              <button
                type="button"
                onClick={handleInvite}
                style={{
                  padding: '8px 16px',
                  background: '#2f6fe4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Invite
              </button>
            </div>
          )}

          <div className="mm-list">
            {members.map((m) => (
              <div className="mm-row" key={m.id}>
                <div className="mm-left">
                  <div className="mm-name">{m.name}</div>
                </div>

                <div className="mm-role">{m.role}</div>

                {canRemove && m.role !== 'Owner' && (
                  <button
                    type="button"
                    className="mm-remove"
                    onClick={() => handleRemove(m)}
                  >
                    Remove <span className="mm-x">×</span>
                  </button>
                )}
                {(!canRemove || m.role === 'Owner') && (
                  <div style={{ width: '140px' }}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mm-footer">
          <button type="button" className="mm-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

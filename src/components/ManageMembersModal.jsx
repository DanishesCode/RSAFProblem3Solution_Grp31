import React, { useState } from "react";
import "./ManageMembersModal.css";

export default function ManageMembersModal({
  isOpen,
  onClose,
  onBack,
  members = [],
  userRole = null, 
  onInviteMember,
  onRemoveMember,
  onError,
  boardName = null,
  repo = null
}) {
  const [inviteInput, setInviteInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const canRemove = userRole === 'owner';
  const canInvite = userRole === 'owner' || userRole === 'editor';

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

  const handleInvite = async () => {
    const githubId = inviteInput.trim();
    if (!githubId) return;
    
    // Check if already a member
    if (members.some(m => m.githubId === githubId || String(m.id) === String(githubId))) {
      if (onError) {
        onError('This user is already a member');
      } else {
        alert('This user is already a member');
      }
      return;
    }
    
    setIsValidating(true);
    const validation = await validateGitHubId(githubId);
    setIsValidating(false);
    
    if (!validation.valid) {
      const errorMsg = `Invalid GitHub ID: ${githubId}. User not found.`;
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(""), 3000);
      if (onError) {
        onError(errorMsg);
      }
      return;
    }
    
    setErrorMessage("");
    
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
                {boardName || 'Back to Board'}
              </button>
            </span>
          </h2>
          {repo && (
            <div className="mm-repo-text">
              Repo: {repo}
            </div>
          )}
        </div>

        <div className="mm-body">
          {canInvite && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="mm-invite"
            value={inviteInput}
            onChange={(e) => {
              setInviteInput(e.target.value);
              setErrorMessage("");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isValidating) {
                handleInvite();
              }
            }}
            placeholder="Invite new members by Collab ID..."
            disabled={isValidating}
          />
              <button
                type="button"
                onClick={handleInvite}
                disabled={isValidating}
                style={{
                  padding: '8px 16px',
                  background: isValidating ? '#ccc' : '#2f6fe4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isValidating ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {isValidating ? 'Validating...' : 'Invite'}
              </button>
            </div>
          )}
          
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

          <div className="mm-list">
            <div className="mm-row mm-header-row">
              <div className="mm-left">
                <div className="mm-name mm-header-text">Name</div>
              </div>
              <div className="mm-role mm-header-text">Role</div>
              <div style={{ width: '140px' }}></div>
            </div>
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

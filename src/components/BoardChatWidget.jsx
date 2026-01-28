import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getBoardChatUnread,
  listBoardMessages,
  markBoardChatRead,
  sendBoardMessage,
} from "../services/api";
import "./BoardChatWidget.css";

// Bottom-left chat popup for COLLAB boards only.
// - per-board chat room
// - unread dot (clears on open)

export default function BoardChatWidget({ boardId, boardName }) {
  const userId = useMemo(
    () => localStorage.getItem("userId") || localStorage.getItem("githubId"),
    []
  );

  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listRef = useRef(null);
  const pollTimerRef = useRef(null);
  const unreadTimerRef = useRef(null);

  const title = boardName ? `${boardName} Chat` : "Board Chat";

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Poll unread indicator while closed
  useEffect(() => {
    if (!boardId || !userId) return;

    // Clear any old timers
    if (unreadTimerRef.current) {
      clearInterval(unreadTimerRef.current);
      unreadTimerRef.current = null;
    }

    // If open, we don't need unread polling (messages polling handles it)
    if (open) return;

    const tick = async () => {
      try {
        const r = await getBoardChatUnread(boardId, userId);
        setHasUnread(!!r?.hasUnread);
      } catch {
        // ignore
      }
    };

    tick();
    unreadTimerRef.current = setInterval(tick, 5000);

    return () => {
      if (unreadTimerRef.current) clearInterval(unreadTimerRef.current);
      unreadTimerRef.current = null;
    };
  }, [boardId, userId, open]);

  // When open: load + poll messages
  useEffect(() => {
    if (!open) return;
    if (!boardId || !userId) return;

    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const msgs = await listBoardMessages(boardId, userId, 75);
        setMessages(msgs);
        setHasUnread(false);
        // Mark as read when opened
        await markBoardChatRead(boardId, userId);
        setTimeout(scrollToBottom, 0);
      } catch (e) {
        setError(e.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    load();

    // Poll new messages every 2s (simple + reliable)
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const msgs = await listBoardMessages(boardId, userId, 75);
        setMessages(msgs);
      } catch {
        // ignore
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [open, boardId, userId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (unreadTimerRef.current) clearInterval(unreadTimerRef.current);
    };
  }, []);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!boardId || !userId) return;

    setText("");
    try {
      await sendBoardMessage(boardId, userId, trimmed);
      // Optimistic-ish refresh
      const msgs = await listBoardMessages(boardId, userId, 75);
      setMessages(msgs);
      setTimeout(scrollToBottom, 0);
    } catch (e) {
      setError(e.message || "Failed to send");
    }
  };

  return (
    <div className="chatWidget">
      {open && (
        <div className="chatPanel" role="dialog" aria-label={title}>
          <div className="chatHeader">
            <div className="chatTitle">{title}</div>
            <button className="chatClose" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>

          <div className="chatBody" ref={listRef}>
            {loading && <div className="chatHint">Loading…</div>}
            {error && <div className="chatError">{error}</div>}

            {!loading && !error && messages.length === 0 && (
              <div className="chatHint">No messages yet. Say hi 👋</div>
            )}

            {messages.map((m) => {
              const mine = String(m.senderId) === String(userId);
              return (
                <div key={m.id} className={`chatMsg ${mine ? "mine" : "theirs"}`}>
                  <div className="chatMeta">
                    <span className="chatName">{m.senderName || `User ${m.senderId}`}</span>
                  </div>
                  <div className="chatBubble">{m.text}</div>
                </div>
              );
            })}
          </div>

          <div className="chatInputRow">
            <input
              className="chatInput"
              value={text}
              placeholder="Type a message…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <button className="chatSend" onClick={onSend}>
              Send
            </button>
          </div>
        </div>
      )}

      <button
        className="chatFab"
        onClick={() => {
          const next = !open;
          setOpen(next);
        }}
        aria-label="Open chat"
      >
        💬
        {hasUnread && !open && <span className="chatBadge" aria-label="Unread messages" />}
      </button>
    </div>
  );
}

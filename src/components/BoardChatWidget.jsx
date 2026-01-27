import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listBoardMessages,
  markBoardChatRead,
  sendBoardMessage,
} from "../services/api";
import { getSocket } from "../services/socket";
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

  const title = boardName ? `${boardName} Chat` : "Board Chat";

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // When open: load messages
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
  }, [open, boardId, userId]);

  // Realtime: receive new messages via Socket.IO
  useEffect(() => {
    if (!boardId || !userId) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const onChatMessage = async ({ message }) => {
      if (!message || !message.id) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      const mine = String(message.senderId) === String(userId);

      if (!mine) {
        if (!open) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
          // Mark as read when open
          try {
            await markBoardChatRead(boardId, userId);
          } catch {
            // ignore
          }
        }
      }

      if (open) setTimeout(scrollToBottom, 0);
    };

    socket.on("chatMessage", onChatMessage);

    return () => {
      socket.off("chatMessage", onChatMessage);
    };
  }, [boardId, userId, open]);

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

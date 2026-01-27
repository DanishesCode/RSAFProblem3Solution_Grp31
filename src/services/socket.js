import { io } from "socket.io-client";

// Single Socket.IO client shared across the app.
// Uses same-origin by default (works with your Express+Vite middleware setup).
let socket = null;

export function getSocket() {
  if (socket) return socket;

  // "" => same origin. If you later deploy frontend separately, change this to your API url.
  socket = io("", {
    withCredentials: true,
    autoConnect: false,
  });

  return socket;
}

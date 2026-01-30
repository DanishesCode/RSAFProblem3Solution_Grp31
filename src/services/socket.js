import { io } from "socket.io-client";

// Same origin works in your setup (API_BASE_URL = "")
// If you deploy separately later, set VITE_WS_URL.
const URL = import.meta.env.VITE_WS_URL || "";

export const socket = io(URL, {
  withCredentials: true,
  transports: ["websocket"],
  autoConnect: false,
});

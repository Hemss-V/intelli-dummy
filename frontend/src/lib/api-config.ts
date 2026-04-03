export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/api";

/** WebSocket server (Express + ws) runs on the backend port. */
export const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) || "ws://localhost:3000";

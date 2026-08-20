import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/authStore";
import type { RealtimeUpdate } from "../types/api";

const WS_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/^http/, "ws");

/**
 * Subscribes to /ws/updates and returns the live stream of updates the event
 * worker publishes (new alerts / incident risk changes). Reconnects with a
 * simple backoff if the socket drops. Returns [] until a real event worker
 * is running and something has actually happened — no synthetic updates are
 * ever injected here.
 */
export function useRealtimeUpdates(maxBuffer = 25) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    let retryDelay = 1000;

    function connect() {
      if (cancelled) return;
      const socket = new WebSocket(`${WS_BASE_URL}/ws/updates?token=${accessToken}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        retryDelay = 1000;
      };
      socket.onmessage = (event) => {
        try {
          const parsed: RealtimeUpdate = JSON.parse(event.data);
          setUpdates((prev) => [parsed, ...prev].slice(0, maxBuffer));
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          setTimeout(connect, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 15000);
        }
      };
      socket.onerror = () => socket.close();
    }

    connect();
    return () => {
      cancelled = true;
      socketRef.current?.close();
    };
  }, [accessToken, maxBuffer]);

  return { updates, connected };
}

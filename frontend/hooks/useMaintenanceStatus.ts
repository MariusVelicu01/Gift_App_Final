import { useEffect, useRef, useState } from 'react';
import { getMaintenanceStatus, MaintenanceStatus } from '../services/maintenanceApi';

// Short enough that "blocked" reaches every open tab within a few seconds of the admin
// flipping the switch, without needing a WebSocket/SSE server this app doesn't have.
const POLL_INTERVAL_MS = 5000;

const IDLE_STATUS: MaintenanceStatus = {
  phase: 'off',
  blocked: false,
  message: null,
  scheduledStart: null,
  scheduledEnd: null,
};

export function useMaintenanceStatus() {
  const [status, setStatus] = useState<MaintenanceStatus>(IDLE_STATUS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getMaintenanceStatus();
        if (!cancelled) setStatus(next);
      } catch {
        // Network hiccup or server unreachable — keep the last known status; the
        // separate "server down" screen already covers a fully unreachable backend.
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return status;
}

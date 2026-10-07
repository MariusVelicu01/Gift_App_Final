import { useEffect, useRef, useState } from 'react';
import { meRequest } from '../services/authApi';

// Same reasoning as useMaintenanceStatus: short polling instead of a WebSocket/SSE
// server this app doesn't have — a blocked/deleted account reflects within a few
// seconds on every open tab, with no refresh needed.
const POLL_INTERVAL_MS = 5000;

export type AccountStatus = {
  blocked: boolean;
  deleted: boolean;
};

const IDLE_STATUS: AccountStatus = { blocked: false, deleted: false };

export function useAccountStatus(token: string | null) {
  const [status, setStatus] = useState<AccountStatus>(IDLE_STATUS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!token) {
      setStatus(IDLE_STATUS);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const profile = await meRequest(token);
        if (!cancelled) {
          setStatus({ blocked: !!profile.blocked, deleted: !!profile.deletedAt });
        }
      } catch {
        // Network hiccup, or the account status gate itself rejected the request
        // (e.g. mid-block) — either way, keep the last known status.
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token]);

  return status;
}

import { apiFetch } from './api';

export type MaintenancePhase = 'off' | 'upcoming' | 'active' | 'expired';
export type MaintenanceMode = 'off' | 'immediate' | 'scheduled';

export type MaintenanceStatus = {
  phase: MaintenancePhase;
  blocked: boolean;
  message: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

export type MaintenanceAdminState = MaintenanceStatus & {
  mode: MaintenanceMode;
  updatedAt: string;
  updatedByUid: string | null;
  effective: MaintenanceStatus;
};

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  return apiFetch('/maintenance/status');
}

export async function getMaintenanceAdminState(token: string): Promise<MaintenanceAdminState> {
  return apiFetch('/maintenance', {}, token);
}

export async function startImmediateMaintenance(token: string, message: string) {
  return apiFetch(
    '/maintenance/immediate',
    { method: 'PUT', body: JSON.stringify({ message }) },
    token
  );
}

export async function scheduleMaintenance(
  token: string,
  start: string,
  end: string,
  message: string
) {
  return apiFetch(
    '/maintenance/schedule',
    { method: 'PUT', body: JSON.stringify({ start, end, message }) },
    token
  );
}

export async function stopMaintenance(token: string) {
  return apiFetch('/maintenance/stop', { method: 'POST' }, token);
}

import { db } from '../config/firebase';

export type MaintenanceMode = 'off' | 'immediate' | 'scheduled';
export type MaintenancePhase = 'off' | 'upcoming' | 'active' | 'expired';

export type MaintenanceDoc = {
  mode: MaintenanceMode;
  message: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  updatedAt: string;
  updatedByUid: string | null;
};

export type MaintenanceEffectiveState = {
  phase: MaintenancePhase;
  blocked: boolean;
  message: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

const COLLECTION = 'config';
const DOC_ID = 'maintenance';

const DEFAULT_DOC: MaintenanceDoc = {
  mode: 'off',
  message: null,
  scheduledStart: null,
  scheduledEnd: null,
  updatedAt: new Date(0).toISOString(),
  updatedByUid: null,
};

// Every connected client polls GET /status every few seconds — this cache keeps that
// traffic from hitting Firestore on every single poll from every user.
const CACHE_TTL_MS = 3000;
let cached: { doc: MaintenanceDoc; expiresAt: number } | null = null;

export async function getMaintenanceDoc(): Promise<MaintenanceDoc> {
  if (cached && cached.expiresAt > Date.now()) return cached.doc;

  const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
  const doc: MaintenanceDoc = snap.exists
    ? { ...DEFAULT_DOC, ...(snap.data() as Partial<MaintenanceDoc>) }
    : DEFAULT_DOC;

  cached = { doc, expiresAt: Date.now() + CACHE_TTL_MS };
  return doc;
}

// Pure function of stored state + current time — a scheduled window activates/expires
// automatically on every read, with no cron job needed to flip a stored flag.
export function computeEffectiveState(
  doc: MaintenanceDoc,
  now: Date = new Date()
): MaintenanceEffectiveState {
  const base = {
    message: doc.message,
    scheduledStart: doc.scheduledStart,
    scheduledEnd: doc.scheduledEnd,
  };

  if (doc.mode === 'immediate') {
    return { ...base, phase: 'active', blocked: true };
  }

  if (doc.mode === 'scheduled' && doc.scheduledStart && doc.scheduledEnd) {
    const t = now.getTime();
    const start = new Date(doc.scheduledStart).getTime();
    const end = new Date(doc.scheduledEnd).getTime();

    if (t < start) return { ...base, phase: 'upcoming', blocked: false };
    if (t < end) return { ...base, phase: 'active', blocked: true };
    return { ...base, phase: 'expired', blocked: false };
  }

  return { ...base, phase: 'off', blocked: false };
}

export async function getEffectiveMaintenanceState(now?: Date): Promise<MaintenanceEffectiveState> {
  const doc = await getMaintenanceDoc();
  return computeEffectiveState(doc, now);
}

async function writeMaintenanceDoc(
  updates: Partial<Omit<MaintenanceDoc, 'updatedAt' | 'updatedByUid'>>,
  adminUid: string
): Promise<MaintenanceDoc> {
  const payload: MaintenanceDoc = {
    ...DEFAULT_DOC,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedByUid: adminUid,
  };
  await db.collection(COLLECTION).doc(DOC_ID).set(payload);
  cached = { doc: payload, expiresAt: Date.now() + CACHE_TTL_MS };
  return payload;
}

export function setImmediateMaintenance(message: string | null, adminUid: string) {
  return writeMaintenanceDoc(
    { mode: 'immediate', message, scheduledStart: null, scheduledEnd: null },
    adminUid
  );
}

export function setScheduledMaintenance(
  start: string,
  end: string,
  message: string | null,
  adminUid: string
) {
  return writeMaintenanceDoc(
    { mode: 'scheduled', scheduledStart: start, scheduledEnd: end, message },
    adminUid
  );
}

export function stopMaintenance(adminUid: string) {
  return writeMaintenanceDoc(
    { mode: 'off', message: null, scheduledStart: null, scheduledEnd: null },
    adminUid
  );
}

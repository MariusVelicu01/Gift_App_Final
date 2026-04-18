import { BackHandler, Platform } from 'react-native';

type WebHistoryState = {
  giftApp: true;
  entryId: number;
  historyIds: number[];
};

type NavigationEntry = {
  id: number;
  onBack: () => void;
};

type NavigationHandle = {
  goBack: () => boolean;
  remove: () => void;
};

let nextEntryId = 1;
let entries: NavigationEntry[] = [];
let initialized = false;
let isHandlingWebHistory = false;

function runLastEntry() {
  const entry = entries.pop();

  if (!entry) {
    return false;
  }

  entry.onBack();
  return true;
}

function getWebHistoryState(): WebHistoryState | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const state = window.history.state;

  if (
    !state ||
    typeof state !== 'object' ||
    (state as WebHistoryState).giftApp !== true ||
    typeof (state as WebHistoryState).entryId !== 'number' ||
    !Array.isArray((state as WebHistoryState).historyIds)
  ) {
    return null;
  }

  return state as WebHistoryState;
}

function handleWebPopState(event: PopStateEvent) {
  if (isHandlingWebHistory) {
    return;
  }

  const state = event.state as WebHistoryState | null;

  if (!state || state.giftApp !== true) {
    return;
  }

  const currentEntryId = entries.length > 0 ? entries[entries.length - 1].id : 0;
  const targetEntryId = state.entryId;

  if (targetEntryId === currentEntryId) {
    return;
  }

  const targetIndex = entries.findIndex((entry) => entry.id === targetEntryId);

  if (targetIndex >= 0) {
    const steps = entries.length - 1 - targetIndex;

    for (let i = 0; i < steps; i += 1) {
      runLastEntry();
    }

    return;
  }

  if (targetEntryId === 0) {
    while (entries.length > 0) {
      runLastEntry();
    }

    return;
  }

  isHandlingWebHistory = true;
  window.history.back();
  setTimeout(() => {
    isHandlingWebHistory = false;
  }, 0);
}

function ensureNavigationHistory() {
  if (initialized) return;

  initialized = true;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState(
      {
        ...(window.history.state || {}),
        giftApp: true,
        entryId: 0,
        historyIds: [0],
      },
      '',
      window.location.href
    );

    window.addEventListener('popstate', handleWebPopState);
  }

  if (Platform.OS === 'android') {
    BackHandler.addEventListener('hardwareBackPress', () => runLastEntry());
  }
}

export function pushAppBackEntry(onBack: () => void): NavigationHandle {
  ensureNavigationHistory();

  const entry: NavigationEntry = {
    id: nextEntryId,
    onBack,
  };
  nextEntryId += 1;
  entries.push(entry);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const previousState = getWebHistoryState();
    const historyIds = previousState?.historyIds ?? [0];

    window.history.pushState(
      {
        giftApp: true,
        entryId: entry.id,
        historyIds: [...historyIds, entry.id],
      },
      '',
      window.location.href
    );
  }

  return {
    goBack: () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.back();
        return true;
      }

      return runLastEntry();
    },
    remove: () => {
      entries = entries.filter((item) => item.id !== entry.id);
    },
  };
}

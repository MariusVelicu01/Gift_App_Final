type Listener = () => void;

let listeners: Listener[] = [];

export function onSessionExpired(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function emitSessionExpired() {
  listeners.forEach((l) => l());
}

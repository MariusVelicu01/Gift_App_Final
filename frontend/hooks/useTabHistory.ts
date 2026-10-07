import { useRef, useState } from 'react';
import { pushAppBackEntry } from '../services/navigationHistory';

type BackHandle = { remove: () => void };

// Registers one browser/hardware back-button entry per distinct tab visited, so the
// back button retraces the tabs you've actually been on instead of exiting the app
// immediately. Revisiting a tab already in the trail (e.g. bouncing between two tabs)
// collapses back to that point rather than growing the stack further — otherwise a
// long session of tab-hopping would take just as long to back out of.
export function useTabHistory<T extends string>(initialTab: T) {
  const [activeTab, setActiveTab] = useState<T>(initialTab);
  const stackRef = useRef<T[]>([initialTab]);
  const handlesRef = useRef<BackHandle[]>([]);

  const navigateToTab = (nextTab: T) => {
    if (nextTab === activeTab) return;

    const stack = stackRef.current;
    const existingIndex = stack.indexOf(nextTab);

    if (existingIndex !== -1) {
      const removedHandles = handlesRef.current.splice(existingIndex);
      removedHandles.forEach((h) => h.remove());
      stack.length = existingIndex + 1;
      setActiveTab(nextTab);
      return;
    }

    const previousTab = activeTab;
    const handle = pushAppBackEntry(() => {
      handlesRef.current.pop();
      stackRef.current.pop();
      setActiveTab(previousTab);
    });
    handlesRef.current.push(handle);
    stack.push(nextTab);
    setActiveTab(nextTab);
  };

  return { activeTab, navigateToTab };
}

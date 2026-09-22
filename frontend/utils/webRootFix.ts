import { Platform } from 'react-native';

// Web-only: without an explicit height on html/body/#root, any RN `flex:1` chain
// (fixed header + scrollable content, used across every client screen) has nothing
// to fill — the page grows to content height and the browser scrolls the document
// instead of any internal ScrollView. This should already be covered by Expo
// Router's default root HTML document, but applying it again here at runtime makes
// it work regardless of dev-server vs static-export differences in how that
// document gets built.
export function applyWebRootFix() {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('web-root-fix')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'web-root-fix';
  styleEl.textContent = '#root,body,html{height:100%}body{overflow:hidden}#root{display:flex}';
  document.head.appendChild(styleEl);
}

import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Root HTML document for web. Without this, `html`/`body`/`#root` have no explicit
// height, so any RN `flex:1` chain (fixed header + scrollable content, used across
// every client screen) has nothing to fill — the whole page grows to content height
// instead, and the browser scrolls the document rather than any internal ScrollView.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ro">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * src/main.tsx
 *
 * Minimal illustration of wiring AuthProvider at the application
 * root. This is the ONLY place AuthProvider should be mounted — every
 * page/component below it reaches auth state via the useAuth() hook,
 * never by re-deriving session state independently.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './features/auth';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

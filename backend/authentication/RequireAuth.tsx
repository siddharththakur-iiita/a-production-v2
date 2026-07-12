/**
 * src/features/auth/RequireAuth.tsx
 *
 * Route guard for pages that require an authenticated customer (e.g.
 * order history, wishlist, account settings). Renders nothing
 * meaningful while the initial session check is in flight to avoid a
 * flash of the fallback UI on every hard page load.
 */
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

interface RequireAuthProps {
  children: ReactNode;
  /** Rendered when the visitor is definitively not authenticated. */
  fallback: ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

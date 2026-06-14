import { Navigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
}

import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Menu, X, HeartPulse } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate({ to: '/login' });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="text-lg">Health Companion</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                Dashboard
              </Link>
              <Link
                to="/medicines"
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                activeProps={{ className: 'bg-accent' }}
              >
                Medicines
              </Link>
              <span className="ml-2 text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              >
                Login
              </Link>
              <Link to="/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </nav>

        <button
          className="rounded-md p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/medicines"
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  Medicines
                </Link>
                <div className="px-3 py-1 text-xs text-muted-foreground">{user.email}</div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
                <Link to="/signup" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

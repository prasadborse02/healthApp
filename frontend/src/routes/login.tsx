import { createFileRoute, Link, useNavigate, Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

function LoginPage() {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (token) return <Navigate to="/dashboard" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path[0] as string] = i.message;
      });
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      toast.success('Welcome back!');
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors) {
        const fe: Record<string, string> = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? (v[0] as string) : String(v);
        });
        setErrors(fe);
      } else {
        toast.error(data?.error || 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Health Companion account">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoComplete="email"
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | string[];
  hint?: string;
  autoComplete?: string;
}) {
  const errors = error ? (Array.isArray(error) ? error : [error]) : [];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length ? `${id}-error` : undefined}
      />
      {hint && errors.length === 0 && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors.length > 0 && (
        <ul id={`${id}-error`} className="space-y-0.5">
          {errors.map((e, i) => (
            <li key={i} className="text-xs text-destructive">
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

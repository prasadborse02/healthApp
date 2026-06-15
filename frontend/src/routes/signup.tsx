import { createFileRoute, Link, useNavigate, Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AuthShell, Field } from './login';

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});

const schema = z
  .object({
    email: z.string().trim().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[a-z]/, 'At least one lowercase letter')
      .regex(/[0-9]/, 'At least one number'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

function SignupPage() {
  const { signup, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  if (token) return <Navigate to="/dashboard" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password, confirm });
    if (!parsed.success) {
      const fe: Record<string, string[]> = {};
      parsed.error.issues.forEach((i) => {
        const field = (i.path[0] as string) || 'form';
        if (!fe[field]) fe[field] = [];
        fe[field].push(i.message);
      });
      setErrors(fe);
      return;
    }
    setSubmitting(true);
    try {
      await signup(parsed.data.email, parsed.data.password);
      toast.success('Account created!');
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number;
          data?: { error?: string; errors?: Record<string, string[]> };
        };
      };
      const data = e?.response?.data;
      if (e?.response?.status === 409) {
        setErrors({ email: [data?.error || 'Email already in use'] });
      } else if (data?.errors) {
        const fe: Record<string, string[]> = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v.map(String) : [String(v)];
        });
        setErrors(fe);
      } else {
        toast.error(data?.error || 'Signup failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start analyzing prescriptions in seconds">
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
          hint="Min 8 characters, uppercase, lowercase, and a number"
          autoComplete="new-password"
        />
        <Field
          id="confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          error={errors.confirm}
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

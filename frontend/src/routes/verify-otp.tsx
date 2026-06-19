import { createFileRoute, Link, useNavigate, Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AuthShell, Field } from './login';

const searchSchema = z.object({
  email: z.string().email().catch(''),
});

export const Route = createFileRoute('/verify-otp')({
  validateSearch: searchSchema,
  component: VerifyOtpPage,
});

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyOtpPage() {
  const { verifyOtp, resendOtp, token } = useAuth();
  const navigate = useNavigate();
  const { email } = Route.useSearch();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (token) return <Navigate to="/dashboard" />;
  // No email in the URL (e.g. opened directly) — send them back to signup.
  if (!email) return <Navigate to="/signup" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setSubmitting(true);
    try {
      await verifyOtp(email, code);
      toast.success('Email verified!');
      navigate({ to: '/dashboard' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e?.response?.data?.error || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp(email);
      toast.success('A new code has been sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode('');
      setError('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Could not resend code');
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle={`We sent a 6-digit code to ${email}`}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          id="code"
          label="Verification code"
          type="text"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          error={error}
          hint="Check your inbox — the code expires in 10 minutes"
          autoComplete="one-time-code"
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify email
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Didn't get the code?{' '}
          {cooldown > 0 ? (
            <span>Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              className="font-medium text-primary hover:underline"
            >
              Resend code
            </button>
          )}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Wrong email?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Back to sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

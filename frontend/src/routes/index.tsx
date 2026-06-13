import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { HeartPulse, Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { token, loading } = useAuth();
  if (loading) return null;
  if (token) return <Navigate to="/dashboard" />;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-50 via-white to-emerald-50" />
      <section className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" /> AI-powered prescription analysis
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Your personal{" "}
          <span className="bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
            Health Companion
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload a prescription, describe your symptoms, and get an AI-generated
          breakdown of medications, conditions, and lifestyle suggestions in seconds.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg">Get started — it's free</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              I already have an account
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            { icon: HeartPulse, title: "Personalized", body: "Tailored to your prescription and symptoms." },
            { icon: Sparkles, title: "Instant insight", body: "AI summary of medicines and conditions." },
            { icon: ShieldCheck, title: "Private", body: "Your data stays secured to your account." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-card p-6 text-left shadow-sm"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

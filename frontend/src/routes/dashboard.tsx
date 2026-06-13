import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api, type Submission } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Loader2, Inbox } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
});

function Dashboard() {
  const [items, setItems] = useState<Submission[] | null>(null);

  useEffect(() => {
    api
      .get<Submission[]>("/submissions")
      .then((r) => setItems(r.data))
      .catch((e) => {
        toast.error(e?.response?.data?.error || "Failed to load submissions");
        setItems([]);
      });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight">Your prescriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload, analyze, and review your prescriptions in one place.
          </p>
        </div>
        <Link to="/submissions/new">
          <Button className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> New submission
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        {items === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((s) => (
              <SubmissionCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionCard({ s }: { s: Submission }) {
  const analyzed = !!s.analysis;
  return (
    <Link
      to="/submissions/$id"
      params={{ id: s.id }}
      className="group block rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold">{s.fileName}</h3>
            {analyzed ? (
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Analyzed
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                Pending
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {s.symptoms}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(s.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-card/50 p-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No prescriptions uploaded yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload your first prescription to get started.
      </p>
      <Link to="/submissions/new" className="mt-6 inline-block">
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Upload prescription
        </Button>
      </Link>
    </div>
  );
}

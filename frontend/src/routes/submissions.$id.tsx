import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api, fileUrl, type Submission, type Analysis, type MedicineRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Download,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/submissions/$id")({
  component: () => (
    <ProtectedRoute>
      <SubmissionDetail />
    </ProtectedRoute>
  ),
});

function SubmissionDetail() {
  const { id } = Route.useParams();
  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<Submission>(`/submissions/${id}`)
      .then((r) => setSub(r.data))
      .catch((e) => toast.error(e?.response?.data?.error || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data } = await api.post<Analysis>(`/submissions/${id}/analyze`);
      setSub((prev) => (prev ? { ...prev, analysis: data } : prev));
      toast.success("Analysis complete");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (!sub) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-muted-foreground">Submission not found.</p>
        <Link to="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  const isImage = sub.fileType.startsWith("image/");
  const fileSrc = fileUrl(sub.filePath);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            {isImage ? (
              <img src={fileSrc} alt={sub.fileName} className="w-full max-h-[60vh] object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="font-medium">{sub.fileName}</p>
                <a href={fileSrc} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Open PDF
                  </Button>
                </a>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground">Symptoms</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{sub.symptoms}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Submitted {new Date(sub.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {!sub.analysis ? (
            <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg sm:text-xl font-semibold">Ready for AI analysis</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate an AI summary of medicines, conditions, and lifestyle tips.
              </p>
              <Button className="mt-6" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI is analyzing your prescription...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Prescription
                  </>
                )}
              </Button>
              {analyzing && (
                <p className="mt-3 text-xs text-muted-foreground">
                  This usually takes 10–15 seconds.
                </p>
              )}
            </div>
          ) : (
            <AnalysisView analysis={sub.analysis} />
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: Analysis }) {
  const [settingUp, setSettingUp] = useState(false);
  const [remindersSet, setRemindersSet] = useState(false);

  const setupReminders = async () => {
    setSettingUp(true);
    try {
      await api.post<MedicineRecord[]>(`/medicines/from-analysis/${analysis.id}`, {
        timezoneOffset: new Date().getTimezoneOffset(),
      });
      setRemindersSet(true);
      toast.success("Medicine reminders created!");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      if (err?.response?.data?.error?.includes("already")) {
        setRemindersSet(true);
        toast.info("Reminders already set up");
      } else {
        toast.error(err?.response?.data?.error || "Failed to set up reminders");
      }
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        role="alert"
        className="flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">Not medical advice</p>
          <p className="mt-0.5">
            This analysis is AI-generated and is NOT medical advice. Always consult a
            qualified healthcare professional before making any medical decisions.
          </p>
        </div>
      </div>

      {analysis.diseases?.length > 0 && (
        <Section title="Detected conditions">
          <div className="flex flex-wrap gap-2">
            {analysis.diseases.map((d, i) => (
              <Badge key={i} variant="secondary" className="bg-sky-100 text-sky-800">
                {d}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {analysis.medicines?.length > 0 && (
        <Section title="Medicines">
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <Table className="min-w-[500px] text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="hidden sm:table-cell">Duration</TableHead>
                  <TableHead className="hidden sm:table-cell">Instructions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.medicines.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                    <TableCell>{m.dosage}</TableCell>
                    <TableCell>{m.frequency}</TableCell>
                    <TableCell className="hidden sm:table-cell">{m.duration}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.instructions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      )}

      {analysis.doctorAdvice && (
        <Section title="Doctor's advice">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">
            {analysis.doctorAdvice}
          </p>
        </Section>
      )}

      {analysis.lifestyle?.length > 0 && (
        <Section title="Lifestyle recommendations">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {analysis.lifestyle.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.medicines?.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm text-center">
          {remindersSet ? (
            <>
              <p className="text-sm text-emerald-600 font-medium">Reminders set up successfully!</p>
              <Link to="/medicines" className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  <Bell className="mr-2 h-4 w-4" /> View Medicines & Reminders
                </Button>
              </Link>
            </>
          ) : (
            <Button onClick={setupReminders} disabled={settingUp} variant="outline">
              {settingUp ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
              ) : (
                <><Bell className="mr-2 h-4 w-4" /> Set up dose reminders</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

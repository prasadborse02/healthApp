import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api, type MedicineRecord } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Clock, Loader2, Pill, SkipForward, X } from "lucide-react";

export const Route = createFileRoute("/medicines")({
  component: () => (
    <ProtectedRoute>
      <MedicinesPage />
    </ProtectedRoute>
  ),
});

function MedicinesPage() {
  const [medicines, setMedicines] = useState<MedicineRecord[] | null>(null);

  useEffect(() => {
    api
      .get<MedicineRecord[]>("/medicines")
      .then((r) => setMedicines(r.data))
      .catch((e) => {
        toast.error(e?.response?.data?.error || "Failed to load medicines");
        setMedicines([]);
      });
  }, []);

  const updateStatus = async (reminderId: string, status: "taken" | "skipped") => {
    try {
      await api.patch(`/medicines/reminders/${reminderId}`, { status });
      setMedicines((prev) =>
        prev
          ? prev.map((m) => ({
              ...m,
              reminders: m.reminders.map((r) =>
                r.id === reminderId ? { ...r, status } : r,
              ),
            }))
          : prev,
      );
      toast.success(`Dose marked as ${status}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err?.response?.data?.error || "Failed to update");
    }
  };

  if (medicines === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Medicines</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track your medications and mark doses as taken or skipped.
      </p>

      {medicines.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed bg-card/50 p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Pill className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No medicines yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a prescription and run AI analysis to generate medicine reminders.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {medicines.map((med) => (
            <MedicineCard key={med.id} medicine={med} onUpdateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function MedicineCard({
  medicine,
  onUpdateStatus,
}: {
  medicine: MedicineRecord;
  onUpdateStatus: (reminderId: string, status: "taken" | "skipped") => void;
}) {
  const now = new Date();
  const upcoming = medicine.reminders
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = medicine.reminders
    .filter((r) => r.status !== "pending")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const takenCount = medicine.reminders.filter((r) => r.status === "taken").length;
  const total = medicine.reminders.length;
  const progress = total > 0 ? Math.round((takenCount / total) * 100) : 0;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold truncate">{medicine.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>{medicine.dosage}</span>
            <span>--</span>
            <span>{medicine.frequency}</span>
            <span>--</span>
            <span>{medicine.duration}</span>
          </div>
          {medicine.instructions && (
            <p className="mt-1 text-sm text-muted-foreground italic">
              {medicine.instructions}
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          <span className="font-medium">{progress}%</span>
          <p className="text-xs text-muted-foreground">
            {takenCount}/{total} doses
          </p>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="p-4 sm:p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming doses
          </h4>
          {/* Card layout for mobile, table for larger screens */}
          <div className="space-y-3 sm:hidden">
            {upcoming.slice(0, 6).map((r) => {
              const scheduled = new Date(r.scheduledAt);
              const isPast = scheduled < now;
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className={`text-sm ${isPast ? "text-amber-600 font-medium" : ""}`}>
                        {scheduled.toLocaleDateString()} {scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-1.5">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                        Pending
                      </Badge>
                      {isPast && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={() => onUpdateStatus(r.id, "taken")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span className="sr-only">Taken</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 text-slate-500 hover:bg-slate-50"
                      onClick={() => onUpdateStatus(r.id, "skipped")}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      <span className="sr-only">Skip</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.slice(0, 6).map((r) => {
                  const scheduled = new Date(r.scheduledAt);
                  const isPast = scheduled < now;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className={isPast ? "text-amber-600 font-medium" : ""}>
                            {scheduled.toLocaleDateString()} {scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isPast && (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={() => onUpdateStatus(r.id, "taken")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Taken
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-slate-500 hover:bg-slate-50"
                            onClick={() => onUpdateStatus(r.id, "skipped")}
                          >
                            <SkipForward className="mr-1 h-3.5 w-3.5" /> Skip
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {upcoming.length > 6 && (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              +{upcoming.length - 6} more upcoming doses
            </p>
          )}
        </div>
      )}

      {past.length > 0 && (
        <div className="border-t p-4 sm:p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            History ({past.length} doses)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {past.slice(0, 20).map((r) => (
              <Badge
                key={r.id}
                className={
                  r.status === "taken"
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                }
              >
                {r.status === "taken" ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <X className="mr-1 h-3 w-3" />
                )}
                {new Date(r.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

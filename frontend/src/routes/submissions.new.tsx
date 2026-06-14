import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, ImageIcon, Loader2, UploadCloud, X } from "lucide-react";

export const Route = createFileRoute("/submissions/new")({
  component: () => (
    <ProtectedRoute>
      <NewSubmission />
    </ProtectedRoute>
  ),
});

const ACCEPTED = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

function NewSubmission() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError("Only JPG, PNG, or PDF files are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File size exceeds the 10MB limit.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    if (!symptoms.trim()) {
      setError("Please describe your symptoms.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("symptoms", symptoms.trim());
      const { data } = await api.post("/submissions", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Submission uploaded");
      navigate({ to: "/submissions/$id", params: { id: data.id } });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">New submission</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload your prescription and describe how you're feeling.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <Label>Prescription file</Label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`mt-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {file ? (
              <div className="flex items-center gap-4 text-left">
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="h-24 w-24 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-10 w-10" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={clearFile} aria-label="Remove file">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-medium">
                    Drag and drop, or <span className="text-primary">browse</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, or PDF — up to 10MB
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" /> Images
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </span>
                </div>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="symptoms">Symptoms / health concerns</Label>
          <Textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Describe your symptoms or health concerns..."
            rows={5}
            className="mt-2"
            required
          />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload submission
          </Button>
        </div>
      </form>
    </div>
  );
}

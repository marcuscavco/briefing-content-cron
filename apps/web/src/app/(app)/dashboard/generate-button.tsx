"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function GenerateButton({ labels }: { labels: Record<string, string> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/run-now", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      if (body.job?.status === "failed") throw new Error(body.job.error ?? "job failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={generate} disabled={pending}>
        {pending ? labels.generating : labels.generateNow}
      </Button>
      {error && (
        <span className="text-sm text-destructive">
          {labels.generateError}: {error}
        </span>
      )}
    </div>
  );
}

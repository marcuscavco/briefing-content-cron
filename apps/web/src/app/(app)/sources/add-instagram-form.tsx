"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addInstagramSource, type AddSourceResult } from "./actions";

export function AddInstagramForm({ labels }: { labels: Record<string, string> }) {
  const [result, formAction, pending] = useActionState<AddSourceResult | null, FormData>(
    addInstagramSource,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="ig-handle">{labels.handle}</Label>
        <Input id="ig-handle" name="handle" required placeholder="@perfil" />
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? labels.validating : labels.add}
      </Button>

      {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}
      {result?.ok && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          {labels.added} ({result.itemCount} {labels.postsFound})
        </p>
      )}
    </form>
  );
}

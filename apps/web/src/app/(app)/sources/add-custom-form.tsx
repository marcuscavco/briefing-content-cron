"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addCustomSource, type AddSourceResult } from "./actions";

const RESULT_MESSAGE_KEY: Record<string, string> = {
  ok: "addedOk",
  partial: "addedPartial",
  blocked: "addedBlocked",
  error: "addedError",
};

export function AddCustomSourceForm({ labels }: { labels: Record<string, string> }) {
  const [result, formAction, pending] = useActionState<AddSourceResult | null, FormData>(
    addCustomSource,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="src-name">{labels.name}</Label>
          <Input id="src-name" name="name" placeholder="Meu portal" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="src-tier">{labels.tier}</Label>
          <select
            id="src-tier"
            name="tier"
            defaultValue="2"
            className="h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm"
          >
            <option value="1">Tier 1 — leitura canônica</option>
            <option value="2">Tier 2 — sinal</option>
            <option value="3">Tier 3 — contexto</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="src-url">{labels.siteUrl}</Label>
        <Input id="src-url" name="url" type="url" required placeholder="https://exemplo.com.br" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="src-feed">{labels.feedUrl}</Label>
        <Input id="src-feed" name="feed_url" type="url" placeholder="https://exemplo.com.br/feed/" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="src-credential">{labels.credential}</Label>
        <Input id="src-credential" name="credential" type="url" />
      </div>

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? labels.validating : labels.validateAndAdd}
      </Button>

      {result && !result.ok && <p className="text-sm text-destructive">{result.error}</p>}

      {result?.ok && result.status && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">
            {labels[RESULT_MESSAGE_KEY[result.status] ?? "addedError"]}{" "}
            <span className="text-muted-foreground">
              ({result.itemCount ?? 0} {labels.itemsFound})
            </span>
          </p>
          {result.preview && result.preview.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {result.preview.map((item) => (
                <li key={item.url}>{item.title}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

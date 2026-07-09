"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addWhatsappDestination,
  confirmVerification,
  removeDestination,
  sendVerificationCode,
  toggleDestination,
  type VerificationResult,
} from "./delivery-actions";

interface Destination {
  id: string;
  phone: string;
  label: string | null;
  kind: string;
  verified: boolean;
  active: boolean;
  verification_expires_at: string | null;
}

export function WhatsappDestinations({
  destinations,
  labels,
}: {
  destinations: Destination[];
  labels: Record<string, string>;
}) {
  const [addResult, addAction, addPending] = useActionState<VerificationResult | null, FormData>(
    addWhatsappDestination,
    null,
  );

  return (
    <div className="flex flex-col gap-4">
      {destinations.length === 0 && (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      )}

      <ul className="flex flex-col gap-3">
        {destinations.map((d) => (
          <DestinationRow key={d.id} destination={d} labels={labels} />
        ))}
      </ul>

      <form action={addAction} className="flex flex-col gap-3 rounded-md border p-3">
        <div className="grid gap-2">
          <Label htmlFor="wa-phone">{labels.phoneLabel}</Label>
          <Input id="wa-phone" name="phone" required placeholder="5585999990000" />
          <p className="text-xs text-muted-foreground">{labels.phoneHint}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="wa-label">{labels.labelLabel}</Label>
          <Input id="wa-label" name="label" placeholder="Meu número" />
        </div>
        <Button type="submit" disabled={addPending} className="w-fit">
          {addPending && <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />}
          {labels.add}
        </Button>
        {addResult && !addResult.ok && (
          <p className="text-sm text-destructive">{addResult.error}</p>
        )}
      </form>
    </div>
  );
}

function DestinationRow({
  destination: d,
  labels,
}: {
  destination: Destination;
  labels: Record<string, string>;
}) {
  const [sendResult, sendAction, sendPending] = useActionState<VerificationResult | null, FormData>(
    sendVerificationCode,
    null,
  );
  const [confirmResult, confirmAction, confirmPending] = useActionState<
    VerificationResult | null,
    FormData
  >(confirmVerification, null);

  const codeSent = Boolean(sendResult?.ok) || Boolean(d.verification_expires_at);
  const justVerified = Boolean(confirmResult?.verified);

  return (
    <li className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-mono font-medium">{d.phone}</span>
        {d.label && <span className="text-muted-foreground">({d.label})</span>}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            d.verified || justVerified
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {d.verified || justVerified ? labels.verified : labels.pending}
        </span>
        {!d.active && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{labels.paused}</span>
        )}
      </div>

      {!d.verified && !justVerified && (
        <div className="flex flex-wrap items-center gap-2">
          <form action={sendAction}>
            <input type="hidden" name="id" value={d.id} />
            <Button type="submit" variant="outline" size="sm" disabled={sendPending}>
              {sendPending && <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />}
              {labels.sendCode}
            </Button>
          </form>
          {codeSent && (
            <form action={confirmAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={d.id} />
              <Input
                name="code"
                placeholder={labels.codePlaceholder}
                className="h-8 w-36"
                maxLength={6}
                required
              />
              <Button type="submit" size="sm" disabled={confirmPending}>
                {confirmPending && <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />}
                {labels.confirm}
              </Button>
            </form>
          )}
          {sendResult?.ok && <span className="text-xs text-muted-foreground">{labels.codeSent}</span>}
          {sendResult && !sendResult.ok && (
            <span className="text-xs text-destructive">{sendResult.error}</span>
          )}
          {confirmResult && !confirmResult.ok && (
            <span className="text-xs text-destructive">{confirmResult.error}</span>
          )}
          {justVerified && <span className="text-xs text-emerald-700">{labels.confirmed}</span>}
        </div>
      )}

      <div className="flex gap-2">
        <form action={toggleDestination}>
          <input type="hidden" name="id" value={d.id} />
          <input type="hidden" name="active" value={String(!d.active)} />
          <Button type="submit" variant="ghost" size="sm">
            {d.active ? labels.pause : labels.resume}
          </Button>
        </form>
        <form action={removeDestination}>
          <input type="hidden" name="id" value={d.id} />
          <Button type="submit" variant="ghost" size="sm" className="text-destructive">
            {labels.remove}
          </Button>
        </form>
      </div>
    </li>
  );
}

"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Botão de server action com loading real (spinner + disabled enquanto pende). */
export function SubmitButton({
  children,
  className,
  pendingText,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled} className={cn(className)}>
      {pending && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
        />
      )}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

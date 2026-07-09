"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Modal de vidro (Ethereal Glass): overlay com blur pesado + painel double-bezel
 * subindo com a curva premium. Fecha por ESC, clique fora ou botão.
 */
export function Modal({
  trigger,
  title,
  description,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open &&
        createPortal(
          <div
            className="fade-in fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-2xl sm:items-center sm:p-6"
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="bezel rise max-h-[92dvh] w-full max-w-2xl overflow-hidden"
            >
              <div className="bezel-core flex max-h-[calc(92dvh-0.75rem)] flex-col">
                <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                  <div>
                    <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
                    {description && (
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setOpen(false)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto px-6 pb-6">{children}</div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

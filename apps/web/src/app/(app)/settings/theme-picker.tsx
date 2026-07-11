"use client";

import { useMemo, useState } from "react";
import { THEME_TAXONOMY } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Seleção fechada de temas: categoria inteira num clique (ex.: todo o
 * Jurídico) ou refinada por subcategoria (só Direito Tributário).
 * O valor vai num input hidden `themes` (labels separados por vírgula) —
 * a server action existente continua igual.
 */
export function ThemePicker({ initial }: { initial: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.filter((t) => THEME_TAXONOMY.some((c) => c.subs.includes(t)))),
  );

  const value = useMemo(() => [...selected].join(", "), [selected]);

  const toggleSub = (sub: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else next.add(sub);
      return next;
    });
  };

  const toggleCategory = (subs: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = subs.every((s) => next.has(s));
      for (const s of subs) {
        if (allOn) next.delete(s);
        else next.add(s);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="themes" value={value} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selected.size === 0
            ? "Nenhum tema selecionado — o briefing cobre tudo que suas fontes trouxerem."
            : `${selected.size} tema${selected.size > 1 ? "s" : ""} selecionado${selected.size > 1 ? "s" : ""}.`}
        </p>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            limpar tudo
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {THEME_TAXONOMY.map((cat) => {
          const onCount = cat.subs.filter((s) => selected.has(s)).length;
          const allOn = onCount === cat.subs.length;
          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-sm font-medium">{cat.label}</span>
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.subs)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    allOn
                      ? "border-amber-400/30 bg-amber-400/15 text-amber-300"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {allOn ? "✓ tudo" : onCount > 0 ? `${onCount}/${cat.subs.length}` : "selecionar tudo"}
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {cat.subs.map((sub) => {
                  const on = selected.has(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSub(sub)}
                      aria-pressed={on}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]",
                        on
                          ? "border-amber-400/30 bg-amber-400/15 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/20 hover:text-foreground",
                      )}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

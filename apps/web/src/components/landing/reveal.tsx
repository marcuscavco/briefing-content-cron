"use client";

import { useEffect, useRef } from "react";

/** Entrada on-scroll (IntersectionObserver — nunca listener de scroll). */
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.style.animationDelay = `${delay}ms`;
            el.classList.add("rise");
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} style={{ opacity: 0 }} className="[&.rise]:opacity-100">
      {children}
    </div>
  );
}

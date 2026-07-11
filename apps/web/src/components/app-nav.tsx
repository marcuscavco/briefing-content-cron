"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/**
 * Fluid Island (skill high-end): pill de vidro flutuante, descolada do topo.
 * Mobile: hamburger que morfa em X + overlay de vidro com reveal escalonado.
 */
export function AppNav({
  brand,
  items,
  signOutSlot,
}: {
  brand: string;
  items: NavItem[];
  signOutSlot: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4">
        <div className="pointer-events-auto mt-6 flex w-max max-w-full items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1.5 pl-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <Link href="/dashboard" className="font-display mr-3 text-sm font-semibold tracking-tight">
            {brand}
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  isActive(item.href)
                    ? "bg-white/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">{signOutSlot}</div>

          {/* hamburger → X (morph) */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative flex size-9 items-center justify-center rounded-full bg-white/5 md:hidden"
          >
            <span
              className={cn(
                "absolute h-px w-4 bg-foreground transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                open ? "rotate-45" : "-translate-y-[3.5px]",
              )}
            />
            <span
              className={cn(
                "absolute h-px w-4 bg-foreground transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                open ? "-rotate-45" : "translate-y-[3.5px]",
              )}
            />
          </button>
        </div>
      </header>

      {/* overlay mobile com reveal escalonado */}
      <div
        className={cn(
          "fixed inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/80 backdrop-blur-3xl transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${100 + i * 50}ms` : "0ms" }}
            className={cn(
              "font-display text-3xl font-medium tracking-tight transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
              open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0",
              isActive(item.href) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
        <div
          style={{ transitionDelay: open ? `${100 + items.length * 50}ms` : "0ms" }}
          className={cn(
            "mt-6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
            open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0",
          )}
        >
          {signOutSlot}
        </div>
      </div>
    </>
  );
}

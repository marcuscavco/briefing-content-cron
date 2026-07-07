import { BRAND } from "@briefing/config/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <span className="text-xl font-semibold tracking-tight">{BRAND.productName}</span>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

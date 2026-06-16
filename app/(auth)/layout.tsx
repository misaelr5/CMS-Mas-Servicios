import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Glow ambiental */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brandYellow/15 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandMark className="h-16 w-auto drop-shadow-[0_8px_24px_rgba(255,212,0,0.15)]" />
        </div>
        {children}
      </div>
    </main>
  );
}

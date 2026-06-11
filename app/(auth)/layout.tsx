import type { ReactNode } from "react";

import { AppLogo } from "@/components/app-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <AppLogo className="mb-6 justify-center" />
        {children}
      </div>
    </main>
  );
}

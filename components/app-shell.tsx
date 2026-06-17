import type { ReactNode } from "react";

import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,212,0,0.12),_transparent_22%),linear-gradient(180deg,_#111111_0%,_#161616_40%,_#111111_100%)] text-brandWhite print:bg-white print:text-black">
      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-7xl animate-fade-in-up">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

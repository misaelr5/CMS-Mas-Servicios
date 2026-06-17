"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ExportCsvButton({ href, label = "Exportar CSV" }: { href: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className="shadow-yellowGlow"
      disabled={loading}
      loading={loading}
      type="button"
      onClick={() => {
        setLoading(true);
        window.location.assign(href);
      }}
    >
      {label}
    </Button>
  );
}

"use client";

import { ErrorPageShell } from "@/components/error-page-shell";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ErrorPageShell code={500} onRetry={reset} />
      </body>
    </html>
  );
}

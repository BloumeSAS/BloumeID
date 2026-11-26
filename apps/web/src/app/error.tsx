"use client";

import { ErrorPageShell } from "@/components/error-page-shell";

export default function GlobalSegmentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPageShell code={500} onRetry={reset} />;
}


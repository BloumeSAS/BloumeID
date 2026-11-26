"use client";

import { useParams } from "next/navigation";
import { ErrorPageShell, type SupportedErrorCode } from "@/components/error-page-shell";

const VALID_CODES = new Set<number>([400, 401, 403, 404, 429, 500, 502, 503]);

export default function HttpStatusErrorPage() {
  const params = useParams<{ code: string }>();
  const parsed = Number(params.code);
  const code: SupportedErrorCode = VALID_CODES.has(parsed)
    ? (parsed as SupportedErrorCode)
    : 500;

  return <ErrorPageShell code={code} />;
}


"use client";

import { GITHUB_RATE_LIMIT_DOCS_URL } from "@/lib/dashboard/error-messages";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

type RateLimitMessageProps = {
  message: string;
  retryAfterSeconds: number | null;
};

export function RateLimitMessage({
  message,
  retryAfterSeconds,
}: RateLimitMessageProps) {
  const showCountdown = retryAfterSeconds !== null && retryAfterSeconds > 0;

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{message}</p>
      </div>
      {showCountdown && (
        <p className="text-xs text-destructive/90 pl-6">
          Retry in about{" "}
          <span className="font-medium tabular-nums">{retryAfterSeconds}</span>{" "}
          second(s).
        </p>
      )}
      <p className="text-xs text-destructive/90 pl-6">
        <Link
          href={GITHUB_RATE_LIMIT_DOCS_URL}
          className="underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          GitHub API rate limits
        </Link>
      </p>
    </div>
  );
}

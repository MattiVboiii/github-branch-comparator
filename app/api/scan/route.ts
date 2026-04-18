import {
  fetchAllRepos,
  GitHubApiError,
  scanRepoPendingCommits,
} from "@/lib/scanRepos";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_REPO_LIMIT = 100;
const MAX_REPO_LIMIT = 500;
const DEFAULT_CONCURRENCY = 8;
const MAX_CONCURRENCY = 20;
const SCAN_CACHE_TTL_MS = 2 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 6;

type ScanItem = {
  repo: string;
  baseBranch: string;
  devBranch: string;
  aheadBy: number;
  commits: Array<{
    sha: string;
    fullSha: string;
    message: string;
    committedAt: string | null;
  }>;
};

type CompletedScan = {
  total: number;
  results: ScanItem[];
};

type CachedScan = {
  expiresAt: number;
  payload: CompletedScan;
};

type RateLimitEntry = {
  windowStart: number;
  count: number;
};

const scanCache = new Map<string, CachedScan>();
const inFlightScans = new Map<string, Promise<CompletedScan>>();
const rateLimitState = new Map<string, RateLimitEntry>();

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
} as const;

function buildCacheKey(
  userKey: string,
  repoLimit: number,
  branches: string[],
  baseBranches: string[],
): string {
  const normalizedBase =
    baseBranches.length > 0 ? baseBranches.join(",") : "__repo_default__";
  return `${userKey}:${Number.isFinite(repoLimit) ? repoLimit : "all"}:${normalizedBase}:${branches.join(",")}`;
}

function cleanupExpiredCache(now: number) {
  for (const [key, value] of scanCache.entries()) {
    if (value.expiresAt <= now) {
      scanCache.delete(key);
    }
  }
}

function isRateLimited(userKey: string, now: number): boolean {
  const entry = rateLimitState.get(userKey);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitState.set(userKey, { windowStart: now, count: 1 });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  return false;
}

function createSseFromPayload(payload: CompletedScan): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "start", total: payload.total })}\n\n`,
        ),
      );
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "progress",
            scanned: payload.total,
            total: payload.total,
            results: [],
          })}\n\n`,
        ),
      );
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "complete",
            results: payload.results,
          })}\n\n`,
        ),
      );
      controller.close();
    },
  });

  return new NextResponse(stream, { headers: SSE_HEADERS });
}

function createSseError(message: string): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", error: message })}\n\n`,
        ),
      );
      controller.close();
    },
  });

  return new NextResponse(stream, { headers: SSE_HEADERS });
}

function toErrorMessage(error: unknown): string {
  if (error instanceof GitHubApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Scan failed";
}

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function parsePositiveInt(
  value: string | null,
  fallback: number,
  max: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  try {
    // Read the access token from the encrypted JWT cookie (never sent to the client).
    const token = await getToken({ req: request });
    if (!token?.accessToken) {
      return createSseError("Not authenticated. Please sign in to GitHub.");
    }

    const headers = {
      Authorization: `token ${token.accessToken as string}`,
      Accept: "application/vnd.github+json",
    };
    const userKey = String(token.sub ?? token.email ?? "unknown-user");

    const limitParam = request.nextUrl.searchParams.get("limit");
    const concurrencyParam = request.nextUrl.searchParams.get("concurrency");
    const branchesParam = request.nextUrl.searchParams.get("branches");
    const baseBranchParam = request.nextUrl.searchParams.get("baseBranch");
    const baseBranches = parseCsvParam(baseBranchParam);
    const parsedDevBranches = parseCsvParam(branchesParam);
    const devBranches =
      parsedDevBranches.length > 0 ? parsedDevBranches : ["dev", "develop"];

    if (branchesParam && parsedDevBranches.length === 0) {
      return createSseError(
        "No valid compare branches were provided. Use comma-separated branch names.",
      );
    }

    const repoLimit =
      limitParam === "all"
        ? Number.POSITIVE_INFINITY
        : parsePositiveInt(limitParam, DEFAULT_REPO_LIMIT, MAX_REPO_LIMIT);
    const concurrency = parsePositiveInt(
      concurrencyParam,
      DEFAULT_CONCURRENCY,
      MAX_CONCURRENCY,
    );

    const now = Date.now();
    const cacheKey = buildCacheKey(
      userKey,
      repoLimit,
      devBranches,
      baseBranches,
    );
    cleanupExpiredCache(now);

    const cached = scanCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return createSseFromPayload(cached.payload);
    }
    const inFlight = inFlightScans.get(cacheKey);
    if (inFlight) {
      try {
        const payload = await inFlight;
        return createSseFromPayload(payload);
      } catch (error) {
        return createSseError(toErrorMessage(error));
      }
    }

    if (isRateLimited(userKey, now)) {
      return createSseError(
        "Rate limit reached. Please wait about a minute before scanning again.",
      );
    }

    const repos = await fetchAllRepos(headers, repoLimit);
    const results: ScanItem[] = [];

    let resolveInFlight: ((payload: CompletedScan) => void) | null = null;
    let rejectInFlight: ((error: unknown) => void) | null = null;

    const inFlightPromise = new Promise<CompletedScan>((resolve, reject) => {
      resolveInFlight = resolve;
      rejectInFlight = reject;
    });
    inFlightScans.set(cacheKey, inFlightPromise);

    // Create a transform stream to send progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "start", total: repos.length })}\n\n`,
            ),
          );

          let scanned = 0;
          let cursor = 0;

          const workerCount = Math.min(concurrency, repos.length || 1);
          const workers = Array.from({ length: workerCount }, () =>
            (async () => {
              while (true) {
                const currentIndex = cursor;
                cursor++;

                if (currentIndex >= repos.length) {
                  return;
                }

                const repo = repos[currentIndex];
                const repoResults = await scanRepoPendingCommits(
                  repo,
                  headers,
                  devBranches,
                  baseBranches,
                );

                if (repoResults.length > 0) {
                  results.push(...repoResults);
                }

                scanned++;

                if (
                  repoResults.length > 0 ||
                  scanned % 3 === 0 ||
                  scanned === repos.length
                ) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        type: "progress",
                        scanned,
                        total: repos.length,
                        results: repoResults,
                      })}\n\n`,
                    ),
                  );
                }
              }
            })(),
          );

          await Promise.all(workers);

          results.sort((a, b) => b.aheadBy - a.aheadBy);

          const payload: CompletedScan = {
            total: repos.length,
            results,
          };

          scanCache.set(cacheKey, {
            expiresAt: Date.now() + SCAN_CACHE_TTL_MS,
            payload,
          });
          resolveInFlight?.(payload);
          inFlightScans.delete(cacheKey);

          if (repos.length === 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  scanned: 0,
                  total: 0,
                  results: [],
                })}\n\n`,
              ),
            );
          }

          // Send final result
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                results: payload.results,
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          const message = toErrorMessage(error);
          rejectInFlight?.(error);
          inFlightScans.delete(cacheKey);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: message })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, { headers: SSE_HEADERS });
  } catch (error) {
    return createSseError(toErrorMessage(error));
  }
}

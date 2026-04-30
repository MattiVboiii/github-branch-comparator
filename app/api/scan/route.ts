import {
  consumeDistributedRateLimit,
  getDistributedValue,
  releaseDistributedLock,
  setDistributedValue,
  tryAcquireDistributedLock,
} from "@/lib/distributed-state";
import { logger } from "@/lib/logger";
import {
  GitHubApiError,
  RepoFilter,
  resolveReposForScan,
  scanRepoPendingCommits,
} from "@/lib/scanRepos";
import { isValidBranchName, isValidRepoFilterToken } from "@/lib/validation";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_REPO_LIMIT = 100;
const MAX_REPO_LIMIT = 500;
const DEFAULT_CONCURRENCY = 5;
const SCAN_CACHE_TTL_MS = 2 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 6;
const INFLIGHT_LOCK_TTL_MS = 90 * 1000;
const INFLIGHT_WAIT_TIMEOUT_MS = 30 * 1000;
const INFLIGHT_WAIT_POLL_MS = 350;

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
  payload: CompletedScan;
};

type ScanErrorPayload = {
  message: string;
  retryAfterSeconds?: number;
};

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
  repoFilter: RepoFilter,
): string {
  const normalizedBase =
    baseBranches.length > 0 ? baseBranches.join(",") : "__repo_default__";
  const normalizedRepos =
    repoFilter.mode === "none"
      ? "__all_repos__"
      : repoFilter.values.join(",").toLowerCase();

  return `${userKey}:${Number.isFinite(repoLimit) ? repoLimit : "all"}:${normalizedBase}:${branches.join(",")}:${normalizedRepos}`;
}

function buildScanCacheStoreKey(cacheKey: string) {
  return `scan:cache:${cacheKey}`;
}

function buildScanLockStoreKey(cacheKey: string) {
  return `scan:lock:${cacheKey}`;
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

function createSseError(payload: ScanErrorPayload): NextResponse {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", error: payload.message, retryAfterSeconds: payload.retryAfterSeconds })}\n\n`,
        ),
      );
      controller.close();
    },
  });

  return new NextResponse(stream, { headers: SSE_HEADERS });
}

function toErrorPayload(error: unknown): ScanErrorPayload {
  if (error instanceof GitHubApiError) {
    return {
      message: error.message,
      retryAfterSeconds: error.retryAfterSeconds ?? undefined,
    };
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      message: error.message,
    };
  }

  return {
    message: "Scan failed",
  };
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

function parseRepoFilter(value: string | null): RepoFilter {
  const parsed = parseCsvParam(value);
  if (parsed.length === 0) {
    return { mode: "none", values: [] };
  }

  return {
    mode: "subset",
    values: parsed,
  };
}

function validateBranchList(items: string[]): string | null {
  for (const branch of items) {
    if (!isValidBranchName(branch)) {
      return `Invalid branch name: ${branch}`;
    }
  }

  return null;
}

function validateRepoFilter(filter: RepoFilter): string | null {
  if (filter.mode === "none") return null;

  for (const token of filter.values) {
    if (!isValidRepoFilterToken(token)) {
      return `Invalid repo filter token: ${token}`;
    }
  }

  return null;
}

async function waitForCachedScan(cacheStoreKey: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const cached = await getDistributedValue<CachedScan>(cacheStoreKey);
    if (cached?.payload) {
      return cached.payload;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, INFLIGHT_WAIT_POLL_MS);
    });
  }

  return null;
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
      return createSseError({
        message: "Not authenticated. Please sign in to GitHub.",
      });
    }

    const headers = {
      Authorization: `token ${token.accessToken as string}`,
      Accept: "application/vnd.github+json",
    };
    const userKey = String(token.sub ?? token.email ?? "unknown-user");

    const rateLimit = await consumeDistributedRateLimit(
      `scan-user:${userKey}`,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS,
    );
    if (rateLimit.limited) {
      return createSseError({
        message: "Rate limit reached. Please wait before scanning again.",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const branchesParam = request.nextUrl.searchParams.get("branches");
    const baseBranchParam = request.nextUrl.searchParams.get("baseBranch");
    const reposParam = request.nextUrl.searchParams.get("repos");
    const checkBranchParam = request.nextUrl.searchParams.get("checkBranch");
    const baseBranches = parseCsvParam(baseBranchParam);
    const parsedDevBranches = parseCsvParam(branchesParam);
    const devBranches =
      parsedDevBranches.length > 0 ? parsedDevBranches : ["dev", "develop"];
    const repoFilter = parseRepoFilter(reposParam);

    const branchValidationError = validateBranchList(devBranches);
    if (branchValidationError) {
      return createSseError({ message: branchValidationError });
    }

    const baseBranchValidationError = validateBranchList(baseBranches);
    if (baseBranchValidationError) {
      return createSseError({ message: baseBranchValidationError });
    }

    const repoValidationError = validateRepoFilter(repoFilter);
    if (repoValidationError) {
      return createSseError({ message: repoValidationError });
    }

    if (branchesParam && parsedDevBranches.length === 0) {
      return createSseError({
        message:
          "No valid compare branches were provided. Use comma-separated branch names.",
      });
    }

    const repoLimit =
      limitParam === "all"
        ? Number.POSITIVE_INFINITY
        : parsePositiveInt(limitParam, DEFAULT_REPO_LIMIT, MAX_REPO_LIMIT);
    const concurrency = DEFAULT_CONCURRENCY;
    const checkBranchExistsBeforeCompare = checkBranchParam !== "0";

    const cacheKey = buildCacheKey(
      userKey,
      repoLimit,
      devBranches,
      baseBranches,
      repoFilter,
    );
    const cacheStoreKey = buildScanCacheStoreKey(cacheKey);
    const lockStoreKey = buildScanLockStoreKey(cacheKey);
    const lockOwner = `${userKey}:${crypto.randomUUID()}`;

    const cached = await getDistributedValue<CachedScan>(cacheStoreKey);
    if (cached?.payload) {
      return createSseFromPayload(cached.payload);
    }

    const lockAcquired = await tryAcquireDistributedLock(
      lockStoreKey,
      lockOwner,
      INFLIGHT_LOCK_TTL_MS,
    );
    if (!lockAcquired) {
      const payload = await waitForCachedScan(
        cacheStoreKey,
        INFLIGHT_WAIT_TIMEOUT_MS,
      );

      if (payload) {
        return createSseFromPayload(payload);
      }

      return createSseError({
        message:
          "A matching scan is already running. Please retry in a few seconds.",
      });
    }

    const repos = await resolveReposForScan(headers, repoLimit, repoFilter);
    const results: ScanItem[] = [];

    // Create a transform stream to send progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          logger.info({
            event: "scan_start",
            userKey,
            repoLimit,
            repoFilter: repoFilter.values,
            baseBranches,
            devBranches,
            totalRepos: repos.length,
          });

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
                  { checkBranchExistsBeforeCompare },
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

          await setDistributedValue(
            cacheStoreKey,
            {
              payload,
            } satisfies CachedScan,
            SCAN_CACHE_TTL_MS,
          );
          await releaseDistributedLock(lockStoreKey, lockOwner);

          logger.info({
            event: "scan_complete",
            userKey,
            totalRepos: repos.length,
            resultCount: payload.results.length,
          });

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
          const payload = toErrorPayload(error);
          await releaseDistributedLock(lockStoreKey, lockOwner);

          logger.error({
            event: "scan_error",
            userKey,
            repoFilter: repoFilter.values,
            baseBranches,
            devBranches,
            retryAfterSeconds: payload.retryAfterSeconds,
            message: payload.message,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: payload.message, retryAfterSeconds: payload.retryAfterSeconds })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, { headers: SSE_HEADERS });
  } catch (error) {
    const payload = toErrorPayload(error);
    return createSseError(payload);
  }
}

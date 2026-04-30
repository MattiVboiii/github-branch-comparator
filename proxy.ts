import { consumeDistributedRateLimit } from "@/lib/distributed-state";
import { NextRequest, NextResponse } from "next/server";

const REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60 * 1000;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown-ip";
}

export async function proxy(request: NextRequest) {
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;
  const result = await consumeDistributedRateLimit(
    `proxy-ip:${ip}`,
    REQUESTS_PER_MINUTE,
    WINDOW_MS,
  );

  if (!result.limited) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Too many requests. Please retry shortly.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
        },
      },
    );
  }

  return new NextResponse("Too many requests. Please retry shortly.", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(result.retryAfterSeconds),
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

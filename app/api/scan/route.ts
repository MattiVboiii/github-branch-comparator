import { fetchAllRepos, scanRepoPendingCommits } from "@/lib/scanRepos";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Read the access token from the encrypted JWT cookie (never sent to the client).
    const token = await getToken({ req: request });
    if (!token?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const headers = {
      Authorization: `token ${token.accessToken as string}`,
      Accept: "application/vnd.github+json",
    };

    const repos = await fetchAllRepos(headers);
    const results: Array<{
      repo: string;
      defaultBranch: string;
      devBranch: string;
      aheadBy: number;
      commits: Array<{ sha: string; message: string }>;
    }> = [];

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

          for (let i = 0; i < repos.length; i++) {
            const repo = repos[i];
            const result = await scanRepoPendingCommits(repo, headers);

            if (result) {
              results.push(result);

              // Send update with new result
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    scanned: i + 1,
                    total: repos.length,
                    results: [result],
                  })}\n\n`,
                ),
              );
            }

            // Send progress update even if no result found
            if (i % 5 === 0 && results.length === 0) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    scanned: i + 1,
                    total: repos.length,
                    results: [],
                  })}\n\n`,
                ),
              );
            }
          }

          // Send final result
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                results,
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Scan failed";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: message })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

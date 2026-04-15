import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type GitHubCommit = {
  sha: string;
  commit: { message: string };
};

type GitHubRepo = {
  full_name: string;
  default_branch: string;
};

async function fetchAllRepos(headers: HeadersInit): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&visibility=all&page=${page}`,
      { headers },
    );
    if (!res.ok) throw new Error(`Failed to fetch repos: ${res.status}`);
    const batch: GitHubRepo[] = await res.json();
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return all;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const headers = {
      Authorization: `token ${session.accessToken}`,
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
            const defaultBranch = repo.default_branch;

            for (const devBranch of ["dev", "develop"]) {
              try {
                const compareRes = await fetch(
                  `https://api.github.com/repos/${repo.full_name}/compare/${defaultBranch}...${devBranch}`,
                  { headers },
                );

                if (!compareRes.ok) continue;

                const data = await compareRes.json();

                if (data.ahead_by > 0) {
                  const result = {
                    repo: repo.full_name,
                    defaultBranch,
                    devBranch,
                    aheadBy: data.ahead_by as number,
                    commits: (data.commits as GitHubCommit[]).map((c) => ({
                      sha: c.sha.slice(0, 7),
                      message: c.commit.message.split("\n")[0],
                    })),
                  };
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
                  break;
                }
              } catch {
                // branch not found, skip silently
              }
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

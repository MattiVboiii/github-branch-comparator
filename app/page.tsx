import { AuthButton } from "@/components/auth-button";
import { Dashboard } from "@/components/dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import {
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  ShieldCheck,
} from "lucide-react";
import { getServerSession } from "next-auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between px-3 sm:px-4 lg:px-5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight text-sm sm:text-base">
              Branch Comparator
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-3 py-6 sm:px-4 sm:py-8 lg:px-5">
        {!session ? (
          <section className="py-4 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-10 sm:space-y-14">
              <div className="flex flex-col items-center text-center">
                <GitBranch className="mb-6 h-12 w-12 sm:h-14 sm:w-14 text-muted-foreground" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  GitHub Branch Comparator
                </h1>
                <p className="mt-3 max-w-md text-sm sm:text-base text-muted-foreground">
                  Sign in with GitHub to scan your repositories for unmerged
                  commits on (for example) dev branches.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-xl border bg-card p-5 text-left">
                  <GitMerge className="h-5 w-5 text-primary" />
                  <h2 className="mt-3 font-semibold tracking-tight">
                    Catch missed merges
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Find repos where your release branches are still behind dev
                    so nothing important is left out.
                  </p>
                </article>

                <article className="rounded-xl border bg-card p-5 text-left">
                  <GitCommitHorizontal className="h-5 w-5 text-primary" />
                  <h2 className="mt-3 font-semibold tracking-tight">
                    Review commit context
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    See commit subjects quickly so you can decide whether to
                    cherry-pick, merge, or ignore.
                  </p>
                </article>

                <article className="rounded-xl border bg-card p-5 text-left">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="mt-3 font-semibold tracking-tight">
                    Sign in safely
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Uses GitHub OAuth through NextAuth, with access limited to
                    only what the scan requires.
                  </p>
                </article>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-5 sm:p-7">
                <h2 className="text-lg font-semibold tracking-tight">
                  How it works
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Step 1
                    </p>
                    <p className="mt-1 text-sm font-medium">Connect GitHub</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Authenticate once to allow repository listing and branch
                      comparison.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Step 2
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Pick your branch names
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Scan one or more branch candidates like dev, develop, or
                      staging.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Step 3
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      Triage pending commits
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Filter by repo, branch, and ahead count to prioritize what
                      needs action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
}

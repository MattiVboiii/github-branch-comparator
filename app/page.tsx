import { Dashboard } from "@/components/dashboard";
import { SiteShell } from "@/components/site-shell";
import { auth } from "@/lib/auth";
import {
  GitBranch,
  GitCommitHorizontal,
  GitMerge,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default async function Page() {
  const session = await auth();

  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-3 py-6 sm:px-4 sm:py-8 lg:px-5">
        {!session ? (
          <section className="py-4 sm:py-10">
            <div className="mx-auto max-w-5xl space-y-10 sm:space-y-14">
              <div className="flex flex-col items-center text-center">
                <GitBranch
                  className="mb-6 h-12 w-12 sm:h-14 sm:w-14 text-muted-foreground"
                  aria-hidden
                />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  GitHub Branch Comparator
                </h1>
                <p className="mt-3 max-w-md text-sm sm:text-base text-muted-foreground">
                  Sign in with GitHub to scan your repositories for unmerged
                  commits on dev, develop, staging, or any branch you name.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-xl border bg-card p-5 text-left">
                  <GitMerge className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="mt-3 font-semibold tracking-tight">
                    Catch missed merges
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Find repos where your release branch is behind development
                    so nothing important is left out before a cut.
                  </p>
                </article>

                <article className="rounded-xl border bg-card p-5 text-left">
                  <GitCommitHorizontal
                    className="h-5 w-5 text-primary"
                    aria-hidden
                  />
                  <h2 className="mt-3 font-semibold tracking-tight">
                    Review commit context
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    See commit subjects quickly, open compares on GitHub, or
                    copy a list for standups.
                  </p>
                </article>

                <article className="rounded-xl border bg-card p-5 text-left">
                  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                  <h2 className="mt-3 font-semibold tracking-tight">
                    Your data stays yours
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your token stays in an encrypted session cookie. Short-lived
                    scan caches are discarded automatically — see our{" "}
                    <Link
                      href="/privacy"
                      className="underline underline-offset-2"
                    >
                      privacy notice
                    </Link>
                    .
                  </p>
                </article>
              </div>

              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-left">
                <h2 className="font-semibold tracking-tight">
                  Before you sign in
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Default scope is{" "}
                  <span className="font-medium">read:user public_repo</span>.
                  Choose <span className="font-medium">read:user repo</span>{" "}
                  when you need private repositories. Tokens are never exposed
                  to browser JavaScript or stored in a database.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Questions? See the{" "}
                  <Link href="/faq" className="underline underline-offset-2">
                    FAQ
                  </Link>
                  .
                </p>
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
                      Authenticate once to list repositories and compare
                      branches.
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
                      Scan dev, develop, staging, or any comma-separated list.
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
                      Filter, export, and open compares or PRs on GitHub.
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
    </SiteShell>
  );
}

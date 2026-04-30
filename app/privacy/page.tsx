import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Privacy and Data Handling
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This app compares GitHub branches and is built with a minimal data
        footprint. Below is a clear summary of what is collected, what is not,
        and how long anything is kept.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">OAuth scopes</h2>
        <p className="text-sm text-muted-foreground">
          Default scope is{" "}
          <span className="font-medium">read:user public_repo</span>. Private
          repository scanning requires a broader scope (
          <span className="font-medium">read:user repo</span>) and should only
          be enabled when needed.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Token handling</h2>
        <p className="text-sm text-muted-foreground">
          Your GitHub access token is stored server-side inside an encrypted,
          httpOnly session cookie. It is never exposed to client-side JavaScript
          and is never written to Redis or any other external store.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          What is kept and for how long
        </h2>
        <p className="text-sm text-muted-foreground">
          Scan results are cached for up to 2 minutes and per-repository
          comparison data for up to 10 minutes. This avoids making redundant
          requests to the GitHub API when the same scan is triggered in quick
          succession. Cached data includes repository names, branch names,
          commit subjects, and ahead-by counts. It is discarded automatically
          when the TTL expires and is never used for any purpose other than
          serving your own scan results back to you.
        </p>
        <p className="text-sm text-muted-foreground">
          Redis also stores rate-limit counters (max 60 seconds) and
          deduplication locks (max 90 seconds), which contain only an anonymized
          user identifier. Your GitHub access token is never written to Redis.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Logging</h2>
        <p className="text-sm text-muted-foreground">
          Server logs record operational metadata only: an anonymized user
          identifier, scan parameters (branch names, repo count), and GitHub API
          error or rate-limit events. Tokens and authorization headers are
          always redacted from logs.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Third parties</h2>
        <p className="text-sm text-muted-foreground">
          The only third party this app communicates with on your behalf is
          GitHub&apos;s API. No analytics, advertising, or tracking scripts are
          loaded.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Revoke access</h2>
        <p className="text-sm text-muted-foreground">
          You can revoke this OAuth app at any time from your GitHub settings:
          <Link
            href="https://github.com/settings/applications"
            className="ml-1 underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            github.com/settings/applications
          </Link>
          . Revoking access immediately invalidates your token. Any temporarily
          cached scan data expires automatically within 2 minutes.
        </p>
      </section>
    </main>
  );
}

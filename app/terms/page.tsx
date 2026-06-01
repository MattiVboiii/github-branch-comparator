import { SiteShell } from "@/components/site-shell";
import { siteConfig } from "@/lib/site";
import Link from "next/link";

export default function TermsPage() {
  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Terms of use</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          By using {siteConfig.name}, you agree to the following terms.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Service</h2>
          <p className="text-sm text-muted-foreground">
            This tool is provided as-is to help you compare GitHub branches. It
            is not affiliated with GitHub, Inc. Features and availability may
            change without notice.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Your responsibility
          </h2>
          <p className="text-sm text-muted-foreground">
            You are responsible for how you use scan results, for complying with
            your organization&apos;s policies, and for revoking OAuth access
            when you no longer need the service.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Disclaimer</h2>
          <p className="text-sm text-muted-foreground">
            Branch comparison data comes from the GitHub API and may be
            incomplete or delayed. Do not rely on this service as the sole check
            before production releases.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Privacy</h2>
          <p className="text-sm text-muted-foreground">
            See the{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              privacy notice
            </Link>{" "}
            for how data is handled.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Report problems via{" "}
            <Link
              href={`${siteConfig.githubRepoUrl}/issues`}
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Issues
            </Link>
            .
          </p>
        </section>
      </main>
    </SiteShell>
  );
}

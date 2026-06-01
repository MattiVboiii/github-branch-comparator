import { SiteShell } from "@/components/site-shell";
import Link from "next/link";

const faqItems = [
  {
    question: "Why do I need to sign in with GitHub?",
    answer:
      "The app uses your GitHub account to list repositories and compare branches through the official API. Your access token is stored only in an encrypted httpOnly session cookie on this server.",
  },
  {
    question: "What OAuth scope should I use?",
    answer:
      "Public repositories only: read:user public_repo. Private repositories: read:user repo. You can switch scope from the account menu after signing in.",
  },
  {
    question: "Why does the OAuth callback fail?",
    answer:
      "The callback URL in your GitHub OAuth app must exactly match NEXTAUTH_URL plus /api/auth/callback/github. For local development that is usually http://localhost:3000/api/auth/callback/github.",
  },
  {
    question: "Why are no repositories shown?",
    answer:
      "Confirm your account has access to the repos, that you granted the correct scope for private repos, and that your org filter (if any) matches owner or full name (org/repo).",
  },
  {
    question: "Why was my scan rate limited?",
    answer:
      "This service limits scans per user to protect GitHub API quota. GitHub may also return its own rate limit — wait for the countdown and try again.",
  },
  {
    question: "Are archived or fork repositories included?",
    answer: "No. Scans skip archived repositories and forks to reduce noise.",
  },
  {
    question: "How long are scan results stored?",
    answer:
      "Full scan results are cached for up to about 2 minutes. Per-repo comparison data may be cached for up to 10 minutes. Your token is never written to Redis.",
  },
] as const;

export default function FaqPage() {
  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Troubleshooting and usage notes for {` `}
          <Link href="/" className="underline underline-offset-2">
            GitHub Branch Comparator
          </Link>
          .
        </p>

        <dl className="mt-8 space-y-6">
          {faqItems.map((item) => (
            <div key={item.question}>
              <dt className="font-semibold tracking-tight">{item.question}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-10 text-sm text-muted-foreground">
          Data handling details are in the{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy notice
          </Link>
          .
        </p>
      </main>
    </SiteShell>
  );
}

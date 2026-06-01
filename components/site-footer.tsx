import { siteConfig } from "@/lib/site";
import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-5">
        <p>
          © {year} {siteConfig.name}. Open source on{" "}
          <Link
            href={siteConfig.githubRepoUrl}
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </Link>
          .
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
          <Link href="/faq" className="underline-offset-2 hover:underline">
            FAQ
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
          <Link
            href={`${siteConfig.githubRepoUrl}/issues`}
            className="underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Report an issue
          </Link>
        </nav>
      </div>
    </footer>
  );
}

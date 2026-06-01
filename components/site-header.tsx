import { AuthButton } from "@/components/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/lib/site";
import { GitBranch } from "lucide-react";
import Link from "next/link";

const navLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-screen-2xl items-center justify-between px-3 sm:px-4 lg:px-5">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GitBranch className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-semibold tracking-tight text-sm sm:text-base">
            {siteConfig.shortName}
          </span>
        </Link>
        <nav
          className="flex items-center gap-2 sm:gap-3"
          aria-label="Site navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}

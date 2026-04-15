import { AuthButton } from "@/components/auth-button";
import { Dashboard } from "@/components/dashboard";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import { GitBranch } from "lucide-react";
import { getServerSession } from "next-auth";

export default async function Page() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight text-sm sm:text-base">
              Branch Comparer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8 sm:px-6">
        {!session ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-24 text-center">
            <GitBranch className="mb-6 h-12 w-12 sm:h-14 sm:w-14 text-muted-foreground" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              GitHub Branch Comparer
            </h1>
            <p className="mt-3 max-w-md text-sm sm:text-base text-muted-foreground">
              Sign in with GitHub to scan your repositories for unmerged commits
              on <code className="font-mono text-xs sm:text-sm">dev</code> or{" "}
              <code className="font-mono text-xs sm:text-sm">develop</code>.
            </p>
          </div>
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
}

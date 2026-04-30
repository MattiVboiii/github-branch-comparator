"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, Lock, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function AuthButton() {
  const { data: session, status } = useSession();
  const scope = (session as { oauthScope?: string } | null)?.oauthScope ?? "";
  const hasPrivateRepoScope = scope.split(/\s+/).includes("repo");

  const reauthWithScope = (scope: string) => {
    signIn(
      "github",
      {
        callbackUrl: window.location.href,
      },
      {
        scope,
        prompt: "consent",
      },
    );
  };

  if (status === "loading") {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />;
  }

  if (!session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={buttonVariants({ size: "sm" })}>
          <GitBranch className="mr-2 h-4 w-4" />
          Sign in with GitHub
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
              Choose access level
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => signIn("github")}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Public repos only</p>
                <p className="text-xs text-muted-foreground">
                  Scope: read:user public_repo
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                signIn("github", undefined, { scope: "read:user repo" })
              }
            >
              <Lock className="mr-2 h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Include private repos</p>
                <p className="text-xs text-muted-foreground">
                  Scope: read:user repo
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const initials = session.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full">
        <Avatar className="h-9 w-9">
          <AvatarImage
            src={session.user?.image ?? undefined}
            alt={session.user?.name ?? "User"}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {session.user?.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {session.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hasPrivateRepoScope ? (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => reauthWithScope("read:user public_repo")}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Switch to public scope
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => reauthWithScope("read:user repo")}
            >
              <Lock className="mr-2 h-4 w-4" />
              Enable private repo scope
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

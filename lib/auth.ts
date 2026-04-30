import type { Account, Session } from "next-auth";
import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import GitHubProvider from "next-auth/providers/github";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "Missing NEXTAUTH_SECRET environment variable. " +
      "Run: openssl rand -base64 32 and set it in your .env.local / Vercel env vars.",
  );
}

if (!process.env.NEXTAUTH_URL) {
  throw new Error(
    "Missing NEXTAUTH_URL environment variable. Set your canonical app URL to protect OAuth callback integrity.",
  );
}

const githubScope =
  process.env.GITHUB_OAUTH_SCOPE?.trim() || "read:user public_repo";

type GitHubOAuthAccount = Account & {
  access_token?: string;
  scope?: string;
};

export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
    // Keep session lifetime short to reduce impact of leaked or revoked tokens.
    maxAge: 60 * 60 * 2,
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          // Use least privilege by default. Set GITHUB_OAUTH_SCOPE to "read:user repo"
          // only when private repositories must be scanned.
          scope: githubScope,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({
      token,
      account,
    }: {
      token: JWT;
      account?: GitHubOAuthAccount | null;
    }) {
      // Store the access token in the encrypted JWT (server-only httpOnly cookie).
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (typeof account?.scope === "string") {
        token.oauthScope = account.scope;
      }

      return token;
    },
    // IMPORTANT: Do NOT forward accessToken into the session object.
    // The session is serialised and sent to the browser via /api/auth/session.
    // Anything added here becomes readable by client-side JavaScript.
    // Server code should call getToken() from "next-auth/jwt" instead.
    async session({ session, token }: { session: Session; token: JWT }) {
      if (typeof token.oauthScope === "string") {
        session.oauthScope = token.oauthScope;
      }

      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

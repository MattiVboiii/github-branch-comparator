import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "Missing NEXTAUTH_SECRET environment variable. " +
      "Run: openssl rand -base64 32 and set it in your .env.local / Vercel env vars.",
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    // Expire sessions after 8 hours so tokens don't stay valid indefinitely.
    maxAge: 60 * 60 * 8,
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          // "repo" is required to compare branches on private repositories.
          // If you only need public repos, change this to "read:user public_repo".
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Store the access token in the encrypted JWT (server-only httpOnly cookie).
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // IMPORTANT: Do NOT forward accessToken into the session object.
    // The session is serialised and sent to the browser via /api/auth/session.
    // Anything added here becomes readable by client-side JavaScript.
    // Server code should call getToken() from "next-auth/jwt" instead.
    async session({ session }) {
      return session;
    },
  },
};

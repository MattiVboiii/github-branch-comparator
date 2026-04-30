import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // accessToken is intentionally NOT in Session — it would be sent to the
  // browser. Server code reads it via getToken() from "next-auth/jwt".
  interface Session extends DefaultSession {
    oauthScope?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // Stored in the encrypted server-side cookie only.
    accessToken?: string;
    oauthScope?: string;
  }
}

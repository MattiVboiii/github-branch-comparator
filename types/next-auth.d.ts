import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  // accessToken is intentionally NOT in Session — it would be sent to the
  // browser. Server code reads it via getToken() from "next-auth/jwt".
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Session extends DefaultSession {}
}

declare module "next-auth/jwt" {
  interface JWT {
    // Stored in the encrypted server-side cookie only.
    accessToken?: string;
  }
}

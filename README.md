# GitHub Branch Comparer

Scan your GitHub repositories and find where `dev`/`develop` is ahead of the default branch.

## GitHub Login Setup (Official OAuth)

This app already uses `next-auth` with a GitHub provider. You only need to create a GitHub OAuth App and add credentials.

1. Go to GitHub OAuth Apps:
   - https://github.com/settings/developers
2. Click **New OAuth App**.
3. Fill in:
   - **Application name**: `GitHub Branch Comparer` (or anything)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Create the app, then copy:
   - **Client ID**
   - **Client Secret** (Generate one if needed)

## Local Environment

1. Copy `.env.example` to `.env.local`.
2. Fill these values in `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
GITHUB_ID=your-client-id
GITHUB_SECRET=your-client-secret
```

Generate a secure secret with one of these:

```bash
openssl rand -base64 32
```

or

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and click **Sign in with GitHub**.

## Notes

- If login fails with callback errors, verify the callback URL exactly matches:
  - `http://localhost:3000/api/auth/callback/github`
- The app requests scope `read:user repo` so it can scan repositories and compare branches.
- For production, set `NEXTAUTH_URL` to your real domain and update the GitHub OAuth app callback URL to match.

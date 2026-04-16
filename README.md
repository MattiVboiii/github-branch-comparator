# GitHub Branch Comparator

GitHub Branch Comparator helps you quickly find repositories where your working branch (e.g. `dev`, `develop`, `staging`, or any custom name) is ahead of the default branch (usually `main`).

This is useful for teams that:

- maintain many repositories,
- release from `main` but develop on a separate branch,
- want a fast way to spot unmerged work before deployments or release planning.

Instead of opening each repository manually, this app scans your accessible repositories and reports where branch comparison shows pending changes.

## What This Website Is For

Use this website when you want to answer questions like:

- "Which repos have work in `develop` (or any branch you specify) that has not reached `main` yet?"
- "Are we missing merges before a release cut?"
- "Where should we create PRs next?"

At a glance, it gives a practical status view for branch drift across repositories.

## Features

- GitHub login using official OAuth (`next-auth` + GitHub provider)
- Repository scan using your GitHub account access
- Configurable branch comparison — enter any branch name(s) to compare against the default branch (defaults to `dev, develop`)
- Quick visibility into where development is ahead

## How To Set It Up Yourself (if you want to run it locally)

### 1. Clone and install

```bash
pnpm install
```

### 2. Create a GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **New OAuth App**
3. Use these values for local development:
   - **Application name**: `GitHub Branch Comparator` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. After creation, copy your:
   - **Client ID**
   - **Client Secret**

### 3. Configure environment variables

Copy `.env.example` to `.env.local`, then set:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
GITHUB_ID=your-client-id
GITHUB_SECRET=your-client-secret
```

Generate `NEXTAUTH_SECRET` with one of these commands:

```bash
openssl rand -base64 32
```

or

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Start the app

```bash
pnpm dev
```

Open http://localhost:3000 and sign in with GitHub.

## Required GitHub Permissions

The app requests:

- `read:user`
- `repo`

These are used to read repository and branch information needed for comparisons.

## Troubleshooting

- Callback/login errors: ensure the callback URL matches exactly:
  - `http://localhost:3000/api/auth/callback/github`
- No repositories shown: verify your account has repo access and granted scopes.
- Production deployment: set `NEXTAUTH_URL` to your live domain and update the OAuth callback URL to match.

export const siteConfig = {
  name: "GitHub Branch Comparator",
  shortName: "Branch Comparator",
  description:
    "See which repos have unmerged commits on dev, develop, staging, or any branch you choose.",
  githubRepoUrl:
    process.env.NEXT_PUBLIC_GITHUB_REPO_URL?.trim() ||
    "https://github.com/MattiVboiii/github-branch-comparator",
} as const;

export function getMetadataBase(): URL {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv);
    } catch {
      // fall through
    }
  }

  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }

  return new URL("http://localhost:3000");
}

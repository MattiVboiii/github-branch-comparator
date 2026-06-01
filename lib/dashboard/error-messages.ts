const PRIVATE_REPO_HINT =
  "This may be a private repository. Sign out and sign in again with the “Include private repos” option.";

const RATE_LIMIT_HINT =
  "GitHub API rate limit reached. Wait for the countdown or see GitHub’s rate limit documentation.";

export function enhanceScanErrorMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("not found") &&
    (lower.includes("repository") || lower.includes("repo"))
  ) {
    return `${message} ${PRIVATE_REPO_HINT}`;
  }

  if (lower.includes("resource not accessible") || lower.includes("403")) {
    if (lower.includes("private") || lower.includes("permission")) {
      return `${message} ${PRIVATE_REPO_HINT}`;
    }
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("secondary rate limit") ||
    lower.includes("abuse")
  ) {
    return `${message} ${RATE_LIMIT_HINT}`;
  }

  return message;
}

export const GITHUB_RATE_LIMIT_DOCS_URL =
  "https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api";

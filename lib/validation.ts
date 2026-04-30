const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9._/-]+$/;
const REPO_TOKEN_PATTERN = /^[a-zA-Z0-9._/-]+$/;

export function isValidBranchName(value: string): boolean {
  if (value.length === 0 || value.length > 255) return false;
  if (value.includes("..") || value.endsWith("/")) return false;
  return BRANCH_NAME_PATTERN.test(value);
}

export function isValidRepoFilterToken(value: string): boolean {
  if (value.length === 0 || value.length > 200) return false;
  if (value.includes("..") || value.includes("#") || value.includes("?")) {
    return false;
  }
  return REPO_TOKEN_PATTERN.test(value);
}

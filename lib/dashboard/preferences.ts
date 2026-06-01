import type { ScanLimit } from "@/lib/dashboard/types";

const STORAGE_KEY = "github-branch-comparator:scan-prefs-v1";

export type ScanPreferences = {
  reposInput: string;
  baseBranchInput: string;
  branchesInput: string;
  scanLimit: ScanLimit;
};

const DEFAULT_PREFS: ScanPreferences = {
  reposInput: "",
  baseBranchInput: "main, master",
  branchesInput: "dev, develop",
  scanLimit: 100,
};

function isScanLimit(value: unknown): value is ScanLimit {
  return value === 50 || value === 100 || value === 200 || value === "all";
}

export function loadScanPreferences(): ScanPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;

    const parsed = JSON.parse(raw) as Partial<ScanPreferences>;
    return {
      reposInput:
        typeof parsed.reposInput === "string"
          ? parsed.reposInput
          : DEFAULT_PREFS.reposInput,
      baseBranchInput:
        typeof parsed.baseBranchInput === "string"
          ? parsed.baseBranchInput
          : DEFAULT_PREFS.baseBranchInput,
      branchesInput:
        typeof parsed.branchesInput === "string"
          ? parsed.branchesInput
          : DEFAULT_PREFS.branchesInput,
      scanLimit: isScanLimit(parsed.scanLimit)
        ? parsed.scanLimit
        : DEFAULT_PREFS.scanLimit,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveScanPreferences(prefs: ScanPreferences): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode errors
  }
}

export type ScanUrlParams = {
  repos?: string;
  baseBranch?: string;
  branches?: string;
  limit?: string;
};

export function readScanParamsFromUrl(
  searchParams: URLSearchParams,
): Partial<ScanPreferences> {
  const partial: Partial<ScanPreferences> = {};

  const repos = searchParams.get("repos");
  if (repos !== null) partial.reposInput = repos;

  const baseBranch = searchParams.get("baseBranch");
  if (baseBranch !== null) partial.baseBranchInput = baseBranch;

  const branches = searchParams.get("branches");
  if (branches !== null) partial.branchesInput = branches;

  const limit = searchParams.get("limit");
  if (limit === "all") {
    partial.scanLimit = "all";
  } else if (limit) {
    const parsed = Number.parseInt(limit, 10);
    if (parsed === 50 || parsed === 100 || parsed === 200) {
      partial.scanLimit = parsed;
    }
  }

  return partial;
}

export function buildScanSearchParams(prefs: ScanPreferences): URLSearchParams {
  const params = new URLSearchParams();

  if (prefs.reposInput.trim().length > 0) {
    params.set("repos", prefs.reposInput.trim());
  }

  if (prefs.baseBranchInput.trim().length > 0) {
    params.set("baseBranch", prefs.baseBranchInput.trim());
  }

  if (prefs.branchesInput.trim().length > 0) {
    params.set("branches", prefs.branchesInput.trim());
  }

  params.set("limit", String(prefs.scanLimit));

  return params;
}

export function syncScanParamsToUrl(prefs: ScanPreferences): void {
  if (typeof window === "undefined") return;

  const params = buildScanSearchParams(prefs);
  const next = params.toString();
  const path = window.location.pathname;
  const url = next.length > 0 ? `${path}?${next}` : path;

  window.history.replaceState(null, "", url);
}

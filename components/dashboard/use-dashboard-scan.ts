"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { enhanceScanErrorMessage } from "@/lib/dashboard/error-messages";
import {
  loadScanPreferences,
  readScanParamsFromUrl,
  saveScanPreferences,
  syncScanParamsToUrl,
  type ScanPreferences,
} from "@/lib/dashboard/preferences";
import { parseScanServerEvent } from "@/lib/dashboard/scan-events";
import type {
  CommitSortOrder,
  RepoSortOrder,
  ScanLimit,
  ScanResult,
} from "@/lib/dashboard/types";
import {
  filterAndSortResults,
  parseBranchesInput,
} from "@/lib/dashboard/utils";

export type ScanSummary = {
  reposScanned: number;
  reposWithDrift: number;
  durationMs: number;
  fromCache: boolean;
};

const MAX_SSE_RETRIES = 1;

function toResultKey(item: ScanResult): string {
  return `${item.repo}|${item.baseBranch}|${item.devBranch}`;
}

function mergeUniqueResults(
  current: ScanResult[],
  incoming: ScanResult[],
): ScanResult[] {
  if (incoming.length === 0) return current;

  const map = new Map<string, ScanResult>();
  for (const result of current) {
    map.set(toResultKey(result), result);
  }
  for (const result of incoming) {
    map.set(toResultKey(result), result);
  }

  return Array.from(map.values());
}

export function useDashboardScan() {
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [minAheadBy, setMinAheadBy] = useState(0);
  const [scanLimit, setScanLimit] = useState<ScanLimit>(100);
  const [reposInput, setReposInput] = useState("");
  const [baseBranchInput, setBaseBranchInput] = useState("main, master");
  const [branchesInput, setBranchesInput] = useState("dev, develop");
  const [repoSortOrder, setRepoSortOrder] =
    useState<RepoSortOrder>("latest-first");
  const [commitSortOrder, setCommitSortOrder] =
    useState<CommitSortOrder>("newest-first");
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const eventSourceRef = useRef<EventSource | null>(null);
  const isScanActiveRef = useRef(false);
  const scanStartedAtRef = useRef<number | null>(null);
  const totalReposRef = useRef(0);
  const retryCountRef = useRef(0);
  const startScanRef = useRef<(isRetry?: boolean) => void>(() => {});

  const maxAheadBy = useMemo(
    () => Math.max(1, ...results.map((result) => result.aheadBy)),
    [results],
  );

  const branchOptions = useMemo(
    () => parseBranchesInput(branchesInput),
    [branchesInput],
  );

  const filteredResults = useMemo(
    () =>
      filterAndSortResults({
        results,
        searchQuery,
        branchFilter,
        minAheadBy,
        repoSortOrder,
      }),
    [results, searchQuery, branchFilter, minAheadBy, repoSortOrder],
  );

  const currentPrefs = useMemo<ScanPreferences>(
    () => ({
      reposInput,
      baseBranchInput,
      branchesInput,
      scanLimit,
    }),
    [reposInput, baseBranchInput, branchesInput, scanLimit],
  );

  useEffect(() => {
    const fromStorage = loadScanPreferences();
    const fromUrl = readScanParamsFromUrl(
      new URLSearchParams(window.location.search),
    );

    const merged: ScanPreferences = { ...fromStorage, ...fromUrl };
    // Hydrate form state from localStorage and shareable URL params once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only preference restore
    setReposInput(merged.reposInput);
    setBaseBranchInput(merged.baseBranchInput);
    setBranchesInput(merged.branchesInput);
    setScanLimit(merged.scanLimit);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    saveScanPreferences(currentPrefs);
    syncScanParamsToUrl(currentPrefs);
  }, [currentPrefs, prefsLoaded]);

  useEffect(() => {
    if (retryAfterSeconds === null || retryAfterSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRetryAfterSeconds((value) => {
        if (value === null || value <= 1) return null;
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryAfterSeconds]);

  function closeCurrentEventSource() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isScanActiveRef.current = false;
  }

  const cancelScan = useCallback(() => {
    closeCurrentEventSource();
    setIsScanning(false);
    setLiveMessage("Scan cancelled.");
  }, []);

  const startScan = useCallback(
    (isRetry = false) => {
      if (!isRetry) {
        retryCountRef.current = 0;
      }

      setError(null);
      setRetryAfterSeconds(null);
      setCacheNotice(null);
      setResults([]);
      setScanned(0);
      setTotal(0);
      setScanSummary(null);
      setIsScanning(true);
      setBranchFilter("all");
      isScanActiveRef.current = true;
      scanStartedAtRef.current = Date.now();

      closeCurrentEventSource();
      isScanActiveRef.current = true;

      const params = new URLSearchParams();
      params.set("limit", scanLimit.toString());
      const repos = reposInput.trim();
      if (repos.length > 0) {
        params.set("repos", repos);
      }

      const baseBranch = baseBranchInput.trim();
      if (baseBranch.length > 0) {
        params.set("baseBranch", baseBranch);
      }

      if (branchOptions.length > 0) {
        params.set("branches", branchOptions.join(","));
      }

      const eventSource = new EventSource(`/api/scan?${params.toString()}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("message", (event) => {
        try {
          const raw = JSON.parse(event.data) as unknown;
          const data = parseScanServerEvent(raw);

          if (!data) {
            setError("Received an invalid response from the scan API.");
            setIsScanning(false);
            closeCurrentEventSource();
            return;
          }

          switch (data.type) {
            case "cached":
              setCacheNotice(
                `Showing cached results (refreshes in about ${data.expiresInSeconds}s).`,
              );
              break;

            case "start":
              totalReposRef.current = data.total;
              setTotal(data.total);
              setLiveMessage(
                `Scan started. ${data.total} repositories to check.`,
              );
              break;

            case "progress":
              setScanned(data.scanned);
              if (data.results.length > 0) {
                setResults((prev) => mergeUniqueResults(prev, data.results));
              }
              setLiveMessage(
                `Scanning: ${data.scanned} of ${data.total} repositories checked.`,
              );
              break;

            case "complete": {
              const merged = mergeUniqueResults([], data.results);
              setResults(merged);
              setIsScanning(false);
              const startedAt = scanStartedAtRef.current ?? Date.now();
              setScanSummary({
                reposScanned: totalReposRef.current,
                reposWithDrift: merged.length,
                durationMs: Date.now() - startedAt,
                fromCache: data.fromCache === true,
              });
              setLiveMessage(
                `Scan complete. Found ${merged.length} repositories with pending commits.`,
              );
              closeCurrentEventSource();
              break;
            }

            case "error": {
              const enhanced = enhanceScanErrorMessage(data.error);
              setError(enhanced);
              if (typeof data.retryAfterSeconds === "number") {
                setRetryAfterSeconds(data.retryAfterSeconds);
              }
              setIsScanning(false);
              closeCurrentEventSource();
              break;
            }
          }
        } catch {
          setError("Failed to parse scan response.");
          setIsScanning(false);
          closeCurrentEventSource();
        }
      });

      eventSource.addEventListener("error", () => {
        if (!isScanActiveRef.current) {
          return;
        }

        closeCurrentEventSource();

        if (retryCountRef.current < MAX_SSE_RETRIES) {
          retryCountRef.current += 1;
          setLiveMessage("Connection lost. Retrying scan once…");
          window.setTimeout(() => startScanRef.current(true), 800);
          return;
        }

        setError(
          enhanceScanErrorMessage(
            "Connection lost during scan. Check your network and try again.",
          ),
        );
        setIsScanning(false);
      });
    },
    [baseBranchInput, branchOptions, reposInput, scanLimit],
  );

  useEffect(() => {
    startScanRef.current = startScan;
  }, [startScan]);

  function handleScan() {
    startScan(false);
  }

  function clearFilters() {
    setSearchQuery("");
    setBranchFilter("all");
    setMinAheadBy(0);
    setRepoSortOrder("latest-first");
    setCommitSortOrder("newest-first");
  }

  useEffect(() => {
    return () => closeCurrentEventSource();
  }, []);

  return {
    results,
    error,
    retryAfterSeconds,
    isScanning,
    scanned,
    total,
    searchQuery,
    setSearchQuery,
    branchFilter,
    setBranchFilter,
    minAheadBy,
    setMinAheadBy,
    scanLimit,
    setScanLimit,
    reposInput,
    setReposInput,
    baseBranchInput,
    setBaseBranchInput,
    branchesInput,
    setBranchesInput,
    repoSortOrder,
    setRepoSortOrder,
    commitSortOrder,
    setCommitSortOrder,
    maxAheadBy,
    branchOptions,
    filteredResults,
    handleScan,
    cancelScan,
    clearFilters,
    scanSummary,
    cacheNotice,
    liveMessage,
  };
}

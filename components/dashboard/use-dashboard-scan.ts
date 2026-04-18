"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type ScanStartEvent = {
  type: "start";
  total: number;
};

type ScanProgressEvent = {
  type: "progress";
  scanned: number;
  total: number;
  results: ScanResult[];
};

type ScanCompleteEvent = {
  type: "complete";
  results: ScanResult[];
};

type ScanErrorEvent = {
  type: "error";
  error: string;
};

type ScanServerEvent =
  | ScanStartEvent
  | ScanProgressEvent
  | ScanCompleteEvent
  | ScanErrorEvent;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isCommit(value: unknown): value is ScanResult["commits"][number] {
  if (!isObject(value)) return false;

  return (
    typeof value.sha === "string" &&
    typeof value.fullSha === "string" &&
    typeof value.message === "string" &&
    (typeof value.committedAt === "string" || value.committedAt === null)
  );
}

function isScanResult(value: unknown): value is ScanResult {
  if (!isObject(value)) return false;

  return (
    typeof value.repo === "string" &&
    typeof value.baseBranch === "string" &&
    typeof value.devBranch === "string" &&
    typeof value.aheadBy === "number" &&
    Array.isArray(value.commits) &&
    value.commits.every((commit) => isCommit(commit))
  );
}

function parseScanServerEvent(raw: unknown): ScanServerEvent | null {
  if (!isObject(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "start":
      if (typeof raw.total !== "number") return null;
      return { type: "start", total: raw.total };
    case "progress":
      if (
        typeof raw.scanned !== "number" ||
        typeof raw.total !== "number" ||
        !Array.isArray(raw.results) ||
        !raw.results.every((item) => isScanResult(item))
      ) {
        return null;
      }
      return {
        type: "progress",
        scanned: raw.scanned,
        total: raw.total,
        results: raw.results,
      };
    case "complete":
      if (
        !Array.isArray(raw.results) ||
        !raw.results.every((r) => isScanResult(r))
      ) {
        return null;
      }
      return { type: "complete", results: raw.results };
    case "error":
      if (typeof raw.error !== "string") return null;
      return { type: "error", error: raw.error };
    default:
      return null;
  }
}

export function useDashboardScan() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [minAheadBy, setMinAheadBy] = useState(0);
  const [scanLimit, setScanLimit] = useState<ScanLimit>(100);
  const [baseBranchInput, setBaseBranchInput] = useState("main, master");
  const [branchesInput, setBranchesInput] = useState("dev, develop");
  const [repoSortOrder, setRepoSortOrder] =
    useState<RepoSortOrder>("latest-first");
  const [commitSortOrder, setCommitSortOrder] =
    useState<CommitSortOrder>("newest-first");

  const eventSourceRef = useRef<EventSource | null>(null);
  const isScanActiveRef = useRef(false);

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

  function closeCurrentEventSource() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isScanActiveRef.current = false;
  }

  function handleScan() {
    setError(null);
    setResults([]);
    setScanned(0);
    setTotal(0);
    setIsScanning(true);
    setBranchFilter("all");
    isScanActiveRef.current = true;

    closeCurrentEventSource();
    isScanActiveRef.current = true;

    const params = new URLSearchParams();
    params.set("limit", scanLimit.toString());
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
          case "start":
            setTotal(data.total);
            break;

          case "progress":
            setScanned(data.scanned);
            if (data.results.length > 0) {
              setResults((prev) => [...prev, ...data.results]);
            }
            break;

          case "complete":
            setResults(data.results);
            setIsScanning(false);
            closeCurrentEventSource();
            break;

          case "error":
            setError(data.error);
            setIsScanning(false);
            closeCurrentEventSource();
            break;
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

      setError("Connection lost during scan");
      setIsScanning(false);
      closeCurrentEventSource();
    });
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
    clearFilters,
  };
}

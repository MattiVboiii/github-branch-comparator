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
  const [branchesInput, setBranchesInput] = useState("dev, develop");
  const [repoSortOrder, setRepoSortOrder] =
    useState<RepoSortOrder>("latest-first");
  const [commitSortOrder, setCommitSortOrder] =
    useState<CommitSortOrder>("newest-first");

  const eventSourceRef = useRef<EventSource | null>(null);

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
  }

  function handleScan() {
    setError(null);
    setResults([]);
    setScanned(0);
    setTotal(0);
    setIsScanning(true);
    setBranchFilter("all");

    closeCurrentEventSource();

    const params = new URLSearchParams();
    params.set("limit", scanLimit.toString());

    if (branchOptions.length > 0) {
      params.set("branches", branchOptions.join(","));
    }

    const eventSource = new EventSource(`/api/scan?${params.toString()}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

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
      } catch (e) {
        console.error("Failed to parse event", e);
      }
    });

    eventSource.addEventListener("error", () => {
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

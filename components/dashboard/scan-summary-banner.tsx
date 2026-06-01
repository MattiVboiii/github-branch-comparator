import type { ScanSummary } from "@/components/dashboard/use-dashboard-scan";
import { Badge } from "@/components/ui/badge";

type ScanSummaryBannerProps = {
  summary: ScanSummary;
  cacheNotice: string | null;
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

export function ScanSummaryBanner({
  summary,
  cacheNotice,
}: ScanSummaryBannerProps) {
  const caughtUp = summary.reposWithDrift === 0;

  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Last scan:</span>
        <span className="font-medium tabular-nums">
          {summary.reposScanned} repo(s) checked
        </span>
        <span aria-hidden>·</span>
        <span className="font-medium tabular-nums">
          {summary.reposWithDrift} with pending commits
        </span>
        <span aria-hidden>·</span>
        <span className="text-muted-foreground tabular-nums">
          {formatDuration(summary.durationMs)}
        </span>
        {summary.fromCache && (
          <Badge variant="secondary" className="text-xs">
            Cached
          </Badge>
        )}
        {caughtUp && summary.reposScanned > 0 && (
          <Badge variant="secondary" className="text-xs">
            All caught up
          </Badge>
        )}
      </div>
      {cacheNotice && (
        <p className="mt-1 text-xs text-muted-foreground">{cacheNotice}</p>
      )}
    </div>
  );
}

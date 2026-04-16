import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScanSkeletons() {
  return (
    <div className="grid gap-4 grid-cols-1 min-[900px]:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card
          key={i}
          className="flex h-full flex-col overflow-hidden min-w-0 w-full"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-24 max-w-full" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="ml-auto h-3 w-24" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <div className="h-40 sm:h-44 px-4 pt-2">
              <div className="grid grid-cols-[84px_1fr_160px] items-center gap-3 border-b pb-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-10 justify-self-end" />
              </div>
              <div className="space-y-2 pt-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div
                    key={j}
                    className="grid grid-cols-[84px_1fr_160px] items-center gap-3"
                  >
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-28 justify-self-end" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

type LiveRegionProps = {
  message: string;
  politeness?: "polite" | "assertive";
};

export function LiveRegion({
  message,
  politeness = "polite",
}: LiveRegionProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

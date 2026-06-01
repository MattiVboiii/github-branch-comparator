import { describe, expect, it } from "vitest";

import { parseScanServerEvent } from "@/lib/dashboard/scan-events";

describe("parseScanServerEvent", () => {
  it("parses start events", () => {
    expect(parseScanServerEvent({ type: "start", total: 12 })).toEqual({
      type: "start",
      total: 12,
    });
  });

  it("parses cached events", () => {
    expect(
      parseScanServerEvent({ type: "cached", expiresInSeconds: 120 }),
    ).toEqual({
      type: "cached",
      expiresInSeconds: 120,
    });
  });

  it("parses complete events with fromCache flag", () => {
    const event = parseScanServerEvent({
      type: "complete",
      results: [],
      fromCache: true,
    });

    expect(event).toEqual({
      type: "complete",
      results: [],
      fromCache: true,
    });
  });

  it("rejects malformed events", () => {
    expect(parseScanServerEvent({ type: "start" })).toBeNull();
    expect(parseScanServerEvent(null)).toBeNull();
  });
});

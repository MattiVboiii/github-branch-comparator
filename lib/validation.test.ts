import { describe, expect, it } from "vitest";

import { isValidBranchName, isValidRepoFilterToken } from "@/lib/validation";

describe("isValidBranchName", () => {
  it("accepts common branch names", () => {
    expect(isValidBranchName("main")).toBe(true);
    expect(isValidBranchName("dev/feature")).toBe(true);
    expect(isValidBranchName("release-1.0")).toBe(true);
  });

  it("rejects invalid branch names", () => {
    expect(isValidBranchName("")).toBe(false);
    expect(isValidBranchName("bad..name")).toBe(false);
    expect(isValidBranchName("trailing/")).toBe(false);
  });
});

describe("isValidRepoFilterToken", () => {
  it("accepts org and full repo tokens", () => {
    expect(isValidRepoFilterToken("my-org")).toBe(true);
    expect(isValidRepoFilterToken("my-org/my-repo")).toBe(true);
  });

  it("rejects unsafe tokens", () => {
    expect(isValidRepoFilterToken("")).toBe(false);
    expect(isValidRepoFilterToken("a?b")).toBe(false);
    expect(isValidRepoFilterToken("a#b")).toBe(false);
  });
});

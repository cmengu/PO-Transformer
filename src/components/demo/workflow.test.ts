import { describe, expect, it } from "vitest";
import { workflowStep } from "./workflow";

describe("workflowStep", () => {
  it("starts with adding purchase orders", () => {
    expect(workflowStep([], 0)).toBe("add");
  });

  it("keeps checking files ahead of reviewing an earlier result", () => {
    expect(workflowStep([{ status: "ready" }], 4)).toBe("check");
    expect(workflowStep([{ status: "processing" }], 4)).toBe("check");
  });

  it("moves to review after the queued work is complete", () => {
    expect(workflowStep([{ status: "completed" }], 4)).toBe("review");
  });
});

import { describe, expect, it } from "vitest";
import { workflowStep, workflowStepState } from "./workflow";

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

  it("keeps Step 2 active when a file needs retrying", () => {
    expect(workflowStep([{ status: "failed" }], 0)).toBe("check");
  });

  it("marks only earlier steps complete", () => {
    expect(workflowStepState("add", [], 0)).toBe("active");
    expect(workflowStepState("check", [], 0)).toBe("upcoming");
    expect(workflowStepState("add", [{ status: "ready" }], 0)).toBe("complete");
    expect(workflowStepState("check", [{ status: "ready" }], 0)).toBe("active");
    expect(workflowStepState("review", [{ status: "completed" }], 2)).toBe("active");
    expect(workflowStepState("check", [{ status: "completed" }], 2)).toBe("complete");
  });
});

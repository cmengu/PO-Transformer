import type { QueuedFile } from "@/files/file-queue";

export type WorkflowStep = "add" | "check" | "review";
export type WorkflowStepState = "complete" | "active" | "upcoming";

const WORKFLOW_STEPS: WorkflowStep[] = ["add", "check", "review"];

/** Chooses the one next action we should make most prominent for a new user. */
export function workflowStep(
  queue: Pick<QueuedFile, "status">[],
  rowCount: number,
): WorkflowStep {
  if (queue.some((item) => item.status !== "completed")) {
    return "check";
  }
  if (rowCount > 0) return "review";
  return "add";
}

export function workflowStepState(
  step: WorkflowStep,
  queue: Pick<QueuedFile, "status">[],
  rowCount: number,
): WorkflowStepState {
  const activeStep = workflowStep(queue, rowCount);
  const stepIndex = WORKFLOW_STEPS.indexOf(step);
  const activeIndex = WORKFLOW_STEPS.indexOf(activeStep);
  if (stepIndex < activeIndex) return "complete";
  if (stepIndex === activeIndex) return "active";
  return "upcoming";
}

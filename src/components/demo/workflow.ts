import type { QueuedFile } from "@/files/file-queue";

export type WorkflowStep = "add" | "check" | "review";

/** Chooses the one next action we should make most prominent for a new user. */
export function workflowStep(
  queue: Pick<QueuedFile, "status">[],
  rowCount: number,
): WorkflowStep {
  if (queue.some((item) => item.status === "validating" || item.status === "ready" || item.status === "processing")) {
    return "check";
  }
  if (rowCount > 0) return "review";
  return "add";
}

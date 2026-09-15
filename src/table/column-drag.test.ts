import { describe, expect, it } from "vitest";
import {
  createColumnDragSession,
  draggedColumnOffset,
  insertionMarker,
  moveIdsToIndex,
  previewInsertionIndex,
} from "./column-drag";

const ids = ["job", "date", "project", "total"];
const rects = ids.map((id, index) => ({ id, left: index * 100, width: 100 }));

describe("column drag session", () => {
  it("keeps a stable insertion point until the pointer leaves the hysteresis band", () => {
    const session = createColumnDragSession(ids, rects, "date", 150)!;

    expect(previewInsertionIndex(session, 250, 1)).toBe(1);
    expect(previewInsertionIndex(session, 263, 1)).toBe(2);
    expect(previewInsertionIndex(session, 250, 2)).toBe(2);
    expect(previewInsertionIndex(session, 237, 2)).toBe(1);
  });

  it("supports first and last slots without changing the original order during preview", () => {
    const session = createColumnDragSession(ids, rects, "project", 250)!;

    expect(previewInsertionIndex(session, 0, 2)).toBe(0);
    expect(previewInsertionIndex(session, 500, 0)).toBe(3);
    expect(ids).toEqual(["job", "date", "project", "total"]);
    expect(moveIdsToIndex(ids, "project", 0)).toEqual(["project", "job", "date", "total"]);
    expect(moveIdsToIndex(ids, "project", 3)).toEqual(["job", "date", "total", "project"]);
  });

  it("shifts neighbours and exposes the insertion slot while the active header follows the pointer", () => {
    const session = {
      ...createColumnDragSession(ids, rects, "date", 150)!,
      previewIndex: 2,
    };

    expect(draggedColumnOffset(session, "date", 280)).toBe(130);
    expect(draggedColumnOffset(session, "project", 280)).toBe(-100);
    expect(insertionMarker(session)).toEqual({ beforeId: "total" });
  });
});

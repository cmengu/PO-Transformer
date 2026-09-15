export type ColumnDragRect = {
  id: string;
  left: number;
  width: number;
};

export type ColumnDragSession = {
  id: string;
  ids: string[];
  rects: ColumnDragRect[];
  startPointerX: number;
  initialIndex: number;
  previewIndex: number;
};

export function createColumnDragSession(
  ids: string[],
  rects: ColumnDragRect[],
  id: string,
  startPointerX: number,
): ColumnDragSession | null {
  const initialIndex = ids.indexOf(id);
  if (initialIndex < 0 || rects.length !== ids.length || !rects.some((rect) => rect.id === id)) {
    return null;
  }

  return { id, ids, rects, startPointerX, initialIndex, previewIndex: initialIndex };
}

export function moveIdsToIndex(
  ids: string[],
  id: string,
  targetIndex: number,
): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, id);
  return next;
}

export function activeColumnCenter(
  session: ColumnDragSession,
  pointerX: number,
): number {
  const active = session.rects.find((rect) => rect.id === session.id);
  if (!active) return pointerX;
  return active.left + active.width / 2 + (pointerX - session.startPointerX);
}

/**
 * Uses the initial header geometry for the entire drag. A small hysteresis band
 * around each neighbour's centre keeps a pointer resting near a boundary stable.
 */
export function previewInsertionIndex(
  session: ColumnDragSession,
  pointerX: number,
  previousIndex: number = session.previewIndex,
  hysteresis = 12,
): number {
  const otherRects = session.rects.filter((rect) => rect.id !== session.id);
  const centre = activeColumnCenter(session, pointerX);
  let index = Math.max(0, Math.min(previousIndex, otherRects.length));

  while (index < otherRects.length) {
    const threshold = otherRects[index].left + otherRects[index].width / 2 + hysteresis;
    if (centre <= threshold) break;
    index += 1;
  }
  while (index > 0) {
    const threshold = otherRects[index - 1].left + otherRects[index - 1].width / 2 - hysteresis;
    if (centre >= threshold) break;
    index -= 1;
  }
  return index;
}

export function withPreviewIndex(
  session: ColumnDragSession,
  previewIndex: number,
): ColumnDragSession {
  return { ...session, previewIndex };
}

export function draggedColumnOffset(
  session: ColumnDragSession,
  id: string,
  pointerX: number,
): number {
  const active = session.rects.find((rect) => rect.id === session.id);
  if (!active) return 0;
  if (id === session.id) return pointerX - session.startPointerX;

  if (
    session.previewIndex > session.initialIndex &&
    session.ids.indexOf(id) > session.initialIndex &&
    session.ids.indexOf(id) <= session.previewIndex
  ) {
    return -active.width;
  }
  if (
    session.previewIndex < session.initialIndex &&
    session.ids.indexOf(id) >= session.previewIndex &&
    session.ids.indexOf(id) < session.initialIndex
  ) {
    return active.width;
  }
  return 0;
}

export function insertionMarker(
  session: ColumnDragSession,
): { beforeId?: string; afterId?: string } {
  const otherIds = session.ids.filter((id) => id !== session.id);
  if (session.previewIndex < otherIds.length) {
    return { beforeId: otherIds[session.previewIndex] };
  }
  return { afterId: otherIds.at(-1) };
}

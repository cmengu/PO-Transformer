"use client";

/** PDFs are read in the browser. The table and its column layout stay local. */

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import type { ReadResult } from "@/domain/types";
import {
  enqueueFiles,
  readyQueuedFiles,
  removeQueuedFile,
  updateQueuedFile,
  validatePdfFile,
  type QueuedFile,
} from "@/files/file-queue";
import { clipboardPayload } from "@/output/clipboard";
import {
  loadColumnLayout,
  resetColumnLayout,
  saveColumnLayout,
} from "@/table/column-preferences";
import {
  columnLabelError,
  createCustomColumn,
  defaultColumnLayout,
  deleteCustomColumn,
  hideBuiltInColumn,
  isBuiltInColumn,
  moveColumnAround,
  moveColumnToIndex,
  parseColumnValue,
  renameCustomColumn,
  restoreBuiltInColumn,
  type ColumnDefinition,
  type ColumnLayout,
} from "@/table/columns";
import type { TrackerTable } from "@/table/table";
import {
  addResults,
  clearFileMessages,
  createTable,
  editCell,
  editCustomCell,
  issueMessage,
  removeCustomColumnValues,
  resetTable,
  sheetStatus,
} from "@/table/table";
import { columnCellValue, flagNote, isFlagged, parseCell } from "./data";

type DropTarget = {
  id: string;
  position: "before" | "after";
};

type ColumnManagerProps = {
  layout: ColumnLayout;
  onAdd: (label: string, type: ColumnDefinition["type"]) => void;
  onRename: (id: string, label: string) => string | null;
  onRestore: (id: string) => void;
  onReset: () => void;
};

function ColumnManager({
  layout,
  onAdd,
  onRename,
  onRestore,
  onReset,
}: ColumnManagerProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColumnDefinition["type"]>("text");
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const allColumns = [...layout.columns, ...layout.hiddenBuiltInColumns];
  const customColumns = layout.columns.filter((column) => !isBuiltInColumn(column));

  function addColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = columnLabelError(allColumns, label);
    if (validationError) {
      setError(validationError);
      return;
    }
    onAdd(label.trim(), type);
    setLabel("");
    setType("text");
    setError(null);
  }

  function finishRename(id: string, fallbackLabel: string) {
    const nextLabel = draftLabels[id] ?? fallbackLabel;
    const validationError = onRename(id, nextLabel);
    setError(validationError);
    if (!validationError) {
      setDraftLabels((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <details className="relative shrink-0">
      <summary className="cursor-pointer list-none rounded-full border border-[#c4b8a6] px-4 py-2 text-sm marker:hidden">
        Manage columns
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-[#d6d0c6] bg-[#faf6ef] p-4 shadow-lg">
        <p className="text-sm font-medium">Add a column</p>
        <form onSubmit={addColumn} className="mt-2 space-y-2">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Column name"
            className="w-full rounded-xl border border-[#c4b8a6] bg-transparent px-3 py-2 text-sm outline-none"
            aria-label="New column name"
          />
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as ColumnDefinition["type"])
              }
              className="min-w-0 flex-1 rounded-xl border border-[#c4b8a6] bg-transparent px-3 py-2 text-sm"
              aria-label="New column type"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-[#1c1917] px-3 py-2 text-sm text-white"
            >
              Add
            </button>
          </div>
        </form>

        {customColumns.length > 0 && (
          <div className="mt-4 border-t border-[#e6ddd0] pt-3">
            <p className="text-sm font-medium">Custom columns</p>
            <div className="mt-2 space-y-2">
              {customColumns.map((column) => (
                <label key={column.id} className="block">
                  <span className="sr-only">Rename {column.label}</span>
                  <input
                    value={draftLabels[column.id] ?? column.label}
                    onChange={(event) =>
                      setDraftLabels((current) => ({
                        ...current,
                        [column.id]: event.target.value,
                      }))
                    }
                    onBlur={() => finishRename(column.id, column.label)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        finishRename(column.id, column.label);
                      }
                    }}
                    className="w-full rounded-xl border border-[#c4b8a6] bg-transparent px-3 py-1.5 text-sm outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {layout.hiddenBuiltInColumns.length > 0 && (
          <div className="mt-4 border-t border-[#e6ddd0] pt-3">
            <p className="text-sm font-medium">Hidden columns</p>
            <ul className="mt-2 space-y-1">
              {layout.hiddenBuiltInColumns.map((column) => (
                <li key={column.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{column.label}</span>
                  <button
                    type="button"
                    onClick={() => onRestore(column.id)}
                    className="rounded-full border border-[#c4b8a6] px-2 py-1 text-xs"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="mt-3 text-xs text-[#9c1c1c]">{error}</p>}
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-sm text-[#7a2e22] underline underline-offset-2"
        >
          Reset columns to defaults
        </button>
      </div>
    </details>
  );
}

function fileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status: QueuedFile["status"]): string {
  if (status === "completed") return "text-[#28633a]";
  if (status === "failed") return "text-[#9c1c1c]";
  if (status === "processing") return "text-[#514216]";
  return "text-[#5c564e]";
}

export function DemoApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const originalColumnsRef = useRef<ColumnDefinition[] | null>(null);
  const pointerDragRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [table, setTable] = useState<TrackerTable>(createTable);
  const [layout, setLayout] = useState<ColumnLayout>(defaultColumnLayout);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [dragOverFiles, setDragOverFiles] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [previewColumns, setPreviewColumns] = useState<ColumnDefinition[] | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function cancelColumnDrag() {
    pointerDragRef.current = null;
    setPreviewColumns(null);
    setDraggedColumnId(null);
    setDropTarget(null);
    originalColumnsRef.current = null;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLayout(loadColumnLayout(window.localStorage));
      setLayoutLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (layoutLoaded) saveColumnLayout(window.localStorage, layout);
  }, [layout, layoutLoaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function cancelWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !draggedColumnId) return;
      cancelColumnDrag();
    }
    window.addEventListener("keydown", cancelWithEscape);
    return () => window.removeEventListener("keydown", cancelWithEscape);
  }, [draggedColumnId]);

  const columns = previewColumns ?? layout.columns;
  const { label } = sheetStatus(table);
  const readyFiles = readyQueuedFiles(queue);
  const failedFiles = queue.filter((item) => item.status === "failed");

  function pickFiles() {
    fileInputRef.current?.click();
  }

  async function validateQueuedItems(items: QueuedFile[]): Promise<QueuedFile[]> {
    const validations = await Promise.all(
      items.map(async (item) => ({
        item,
        validation: await validatePdfFile(item.file),
      })),
    );
    setQueue((current) => {
      let next = current;
      for (const { item, validation } of validations) {
        next = updateQueuedFile(next, item.id, validation.status, validation.detail);
      }
      return next;
    });
    return validations
      .filter(({ validation }) => validation.status === "ready")
      .map(({ item, validation }) => ({
        ...item,
        status: validation.status,
        detail: validation.detail,
      }));
  }

  function stageFiles(files: File[]) {
    if (files.length === 0) return;
    setDragOverFiles(false);
    const result = enqueueFiles(queue, files);
    setQueue(result.queue);
    setQueueNotice(
      result.skippedDuplicateCount > 0
        ? `${result.skippedDuplicateCount} duplicate file${result.skippedDuplicateCount === 1 ? " was" : "s were"} skipped`
        : null,
    );
    void validateQueuedItems(result.added);
  }

  async function processItems(items: QueuedFile[]) {
    if (isProcessing || items.length === 0) return;
    setIsProcessing(true);
    try {
      const { readPo } = await import("@/read/read-po");
      for (const item of items) {
        setQueue((current) =>
          updateQueuedFile(current, item.id, "processing", "Reading purchase order…"),
        );
        try {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          const result: ReadResult = await readPo(item.file.name, bytes);
          setTable((current) => addResults(current, [result]));
          if (result.kind === "rows") {
            setQueue((current) =>
              updateQueuedFile(
                current,
                item.id,
                "completed",
                `Processed ${result.rows.length} row${result.rows.length === 1 ? "" : "s"}`,
              ),
            );
          } else {
            setQueue((current) =>
              updateQueuedFile(current, item.id, "failed", issueMessage(result.issue)),
            );
          }
        } catch {
          setQueue((current) =>
            updateQueuedFile(current, item.id, "failed", "Could not process this file"),
          );
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function processReadyFiles() {
    void processItems(readyFiles);
  }

  function retryFailedFiles() {
    if (isProcessing || failedFiles.length === 0) return;
    setTable((current) =>
      clearFileMessages(current, failedFiles.map((item) => item.file.name)),
    );
    setQueue((current) =>
      current.map((item) =>
        item.status === "failed"
          ? { ...item, status: "validating", detail: "Checking file…" }
          : item,
      ),
    );
    void validateQueuedItems(failedFiles).then((ready) => processItems(ready));
  }

  function startOver() {
    setTable(resetTable());
    setQueue([]);
    setQueueNotice(null);
  }

  function addColumn(labelToAdd: string, type: ColumnDefinition["type"]) {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLayout((current) => ({
      ...current,
      columns: [...current.columns, createCustomColumn(id, labelToAdd, type)],
    }));
  }

  function renameColumn(id: string, labelToUse: string): string | null {
    const validationError = columnLabelError(layout.columns, labelToUse, id);
    if (validationError) return validationError;
    setLayout((current) => ({
      ...current,
      columns: renameCustomColumn(current.columns, id, labelToUse),
    }));
    return null;
  }

  function hideColumn(id: string) {
    setLayout((current) => hideBuiltInColumn(current, id));
  }

  function restoreColumn(id: string) {
    setLayout((current) => restoreBuiltInColumn(current, id));
  }

  function deleteColumn(id: string) {
    setLayout((current) => ({
      ...current,
      columns: deleteCustomColumn(current.columns, id),
    }));
    setTable((current) => removeCustomColumnValues(current, [id]));
  }

  function resetColumns() {
    const customColumnIds = layout.columns
      .filter((column) => !isBuiltInColumn(column))
      .map((column) => column.id);
    setTable((current) => removeCustomColumnValues(current, customColumnIds));
    setLayout(resetColumnLayout(window.localStorage));
  }

  function moveColumnBy(id: string, delta: number) {
    setLayout((current) => {
      const index = current.columns.findIndex((column) => column.id === id);
      return {
        ...current,
        columns: moveColumnToIndex(current.columns, id, index + delta),
      };
    });
  }

  function previewAtPoint(clientX: number, clientY: number, draggedId: string) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLTableCellElement>("th[data-column-id]");
    const targetId = target?.dataset.columnId;
    const original = originalColumnsRef.current;
    if (!target || !targetId || !original) return null;
    const bounds = target.getBoundingClientRect();
    const position =
      clientX < bounds.left + bounds.width / 2 ? "before" : "after";
    return {
      target: { id: targetId, position } satisfies DropTarget,
      columns: moveColumnAround(original, draggedId, targetId, position),
    };
  }

  function startColumnDrag(
    event: PointerEvent<HTMLTableCellElement>,
    id: string,
  ) {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDragRef.current = { id, x: event.clientX, y: event.clientY };
  }

  function previewColumnDrop(event: PointerEvent<HTMLTableCellElement>) {
    const pending = pointerDragRef.current;
    if (!pending) return;
    const movedFarEnough =
      Math.hypot(event.clientX - pending.x, event.clientY - pending.y) >= 6;
    if (!draggedColumnId && !movedFarEnough) return;
    if (!originalColumnsRef.current) originalColumnsRef.current = layout.columns;
    if (!draggedColumnId) setDraggedColumnId(pending.id);
    const scrollContainer = tableScrollRef.current;
    if (scrollContainer) {
      const bounds = scrollContainer.getBoundingClientRect();
      const edge = 48;
      if (event.clientX < bounds.left + edge) scrollContainer.scrollLeft -= 18;
      if (event.clientX > bounds.right - edge) scrollContainer.scrollLeft += 18;
    }
    const preview = previewAtPoint(event.clientX, event.clientY, pending.id);
    if (!preview) return;
    setDropTarget(preview.target);
    setPreviewColumns(preview.columns);
  }

  function finishColumnDrag(event: PointerEvent<HTMLTableCellElement>) {
    const pending = pointerDragRef.current;
    pointerDragRef.current = null;
    if (!pending || !originalColumnsRef.current) return;
    const preview = previewAtPoint(event.clientX, event.clientY, pending.id);
    if (preview) {
      setLayout((current) => ({ ...current, columns: preview.columns }));
    }
    setDraggedColumnId(null);
    setDropTarget(null);
    setPreviewColumns(null);
    originalColumnsRef.current = null;
  }

  function onEdit(rowIndex: number, column: ColumnDefinition, value: string) {
    if (column.source) {
      const parsed = parseCell(column.source, value);
      setTable((current) =>
        editCell(current, rowIndex, column.source!, parsed as never),
      );
      return;
    }
    setTable((current) =>
      editCustomCell(current, rowIndex, column.id, parseColumnValue(column, value)),
    );
  }

  function onCopy() {
    const { html, plain } = clipboardPayload(table.rows, columns);
    void navigator.clipboard
      .write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ])
      .then(() => setToast("Copied — paste into your email"))
      .catch(() =>
        setToast("Copy didn't work in this browser — use Download Excel"),
      );
  }

  function onDownload() {
    void import("@/output/download-excel").then(({ downloadExcel }) =>
      downloadExcel(table.rows, columns),
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe6] px-6 pb-16 pt-12 text-[#1c1917]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          stageFiles(files);
        }}
      />

      <header className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs tracking-[0.25em] uppercase text-[#7c746a]">
          PO Transformer
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight">
          AEM purchase orders, as tracker rows
        </h1>
        <p className="mt-3 text-[#5c564e]">
          Files stay on your computer. Nothing is uploaded.
        </p>
      </header>

      <main className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[1.5rem] bg-[#faf6ef] shadow-sm">
          <div className="relative flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="text-sm">
              {label ?? "Arrange the output columns, then stage purchase orders below"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {table.rows.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white"
                  >
                    Copy table
                  </button>
                  <button
                    type="button"
                    onClick={onDownload}
                    className="rounded-full border border-[#1c1917] px-4 py-2 text-sm"
                  >
                    Download Excel
                  </button>
                </>
              )}
              <ColumnManager
                layout={layout}
                onAdd={addColumn}
                onRename={renameColumn}
                onRestore={restoreColumn}
                onReset={resetColumns}
              />
              <button
                type="button"
                onClick={startOver}
                className="rounded-full px-3 py-2 text-sm text-[#5c564e]"
              >
                Start over
              </button>
            </div>
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto">
            <table className="min-w-max border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {columns.map((column, index) => {
                    const slotBefore =
                      dropTarget?.id === column.id &&
                      dropTarget.position === "before";
                    const slotAfter =
                      dropTarget?.id === column.id &&
                      dropTarget.position === "after";
                    return (
                      <th
                        key={column.id}
                        data-column-id={column.id}
                        onPointerDown={(event) => startColumnDrag(event, column.id)}
                        onPointerMove={previewColumnDrop}
                        onPointerUp={finishColumnDrag}
                        onPointerCancel={cancelColumnDrag}
                        className={`relative min-w-36 touch-none select-none border border-[#d6d0c6] px-3 py-2 text-left font-semibold whitespace-nowrap transition-transform duration-150 ${
                          draggedColumnId === column.id
                            ? "cursor-grabbing opacity-50"
                            : "cursor-grab"
                        }`}
                        style={{
                          backgroundColor: column.headerBg,
                          color: column.headerFg,
                        }}
                      >
                        {slotBefore && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 -left-1 z-20 w-1 rounded bg-[#1c1917] shadow-[0_0_0_2px_#faf6ef]"
                          />
                        )}
                        {slotAfter && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 -right-1 z-20 w-1 rounded bg-[#1c1917] shadow-[0_0_0_2px_#faf6ef]"
                          />
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="select-none text-[#7c746a]" aria-hidden="true">⠿</span>
                          <span>{column.label}</span>
                          <span className="ml-auto flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveColumnBy(column.id, -1)}
                              disabled={index === 0}
                              aria-label={`Move ${column.label} left`}
                              className="rounded px-1 disabled:opacity-30"
                            >
                              ‹
                            </button>
                            <button
                              type="button"
                              onClick={() => moveColumnBy(column.id, 1)}
                              disabled={index === columns.length - 1}
                              aria-label={`Move ${column.label} right`}
                              className="rounded px-1 disabled:opacity-30"
                            >
                              ›
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                isBuiltInColumn(column)
                                  ? hideColumn(column.id)
                                  : deleteColumn(column.id)
                              }
                              aria-label={`${isBuiltInColumn(column) ? "Hide" : "Delete"} ${column.label} column`}
                              className="rounded px-1 text-[#7a2e22]"
                            >
                              {isBuiltInColumn(column) ? "−" : "×"}
                            </button>
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="border border-[#e6ddd0] px-4 py-8 text-center text-[#7c746a]"
                    >
                      Process a purchase order to populate this table. You can already drag headers to arrange the output.
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => {
                        const flagged =
                          column.source ? isFlagged(row, column.source) : false;
                        return (
                          <td
                            key={column.id}
                            className="border border-[#e6ddd0] p-0 align-top"
                            style={{
                              backgroundColor: flagged ? "#FFC7CE" : "#faf6ef",
                            }}
                          >
                            <input
                              value={columnCellValue(row, column)}
                              onChange={(event) =>
                                onEdit(rowIndex, column, event.target.value)
                              }
                              className="w-36 bg-transparent px-3 py-2 outline-none"
                              aria-label={`${column.label} row ${rowIndex + 1}`}
                            />
                            {flagged && (
                              <p className="px-3 pb-2 text-[11px] text-[#9c1c1c]">
                                {column.source ? flagNote(row, column.source) : ""}
                              </p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {table.messages.length > 0 && (
          <ul className="space-y-2 text-sm">
            {table.messages.map((message, index) => (
              <li
                key={`${index}-${message.file}`}
                className="rounded-2xl bg-[#f3e4e0] px-4 py-3 text-[#7a2e22]"
              >
                <span className="font-medium">{message.file}</span> — {message.message}
              </li>
            ))}
          </ul>
        )}

        <section
          onDragOver={(event) => {
            event.preventDefault();
            setDragOverFiles(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragOverFiles(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            stageFiles(Array.from(event.dataTransfer.files));
          }}
          className={`rounded-[1.5rem] border-2 border-dashed p-5 transition ${
            dragOverFiles
              ? "border-[#1c1917] bg-[#ece4d6]"
              : "border-[#c4b8a6] bg-[#faf6ef]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl">Stage purchase orders</h2>
              <p className="mt-1 text-sm text-[#5c564e]">
                Drop PDFs here or browse. Files wait for your approval before processing.
              </p>
            </div>
            <button
              type="button"
              onClick={pickFiles}
              className="rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white"
            >
              Add PDFs
            </button>
          </div>

          {queue.length > 0 && (
            <>
              <ul className="mt-4 divide-y divide-[#e6ddd0] rounded-xl border border-[#e6ddd0] bg-[#fffdf8]">
                {queue.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-[#7c746a]">{fileSize(item.file.size)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${statusClass(item.status)}`}>
                        {item.detail}
                      </span>
                      <button
                        type="button"
                        disabled={isProcessing || item.status === "processing"}
                        onClick={() =>
                          setQueue((current) => removeQueuedFile(current, item.id))
                        }
                        className="text-xs text-[#7a2e22] underline underline-offset-2 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {queueNotice && <p className="mt-2 text-xs text-[#7c746a]">{queueNotice}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing || readyFiles.length === 0}
                  onClick={processReadyFiles}
                  className="rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isProcessing
                    ? "Processing…"
                    : `Process ${readyFiles.length} file${readyFiles.length === 1 ? "" : "s"}`}
                </button>
                {failedFiles.length > 0 && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={retryFailedFiles}
                    className="rounded-full border border-[#1c1917] px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Retry {failedFiles.length} failed file{failedFiles.length === 1 ? "" : "s"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    setQueue([]);
                    setQueueNotice(null);
                  }}
                  className="px-3 py-2 text-sm text-[#5c564e] disabled:opacity-40"
                >
                  Clear queue
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {toast && (
        <div className="fixed top-6 right-6 rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Quiet studio look. PDFs are read in the browser via readPo; nothing is uploaded.
 */

import { useEffect, useRef, useState } from "react";
import type { ReadResult } from "@/domain/types";
import type { TrackerTable } from "@/table/table";
import {
  addResults,
  createTable,
  editCell,
  editCustomCell,
  resetTable,
  sheetStatus,
} from "@/table/table";
import {
  createCustomColumn,
  defaultColumns,
  moveColumn,
  parseColumnValue,
  removeColumn,
  type ColumnDefinition,
} from "@/table/columns";
import { clipboardPayload } from "@/output/clipboard";
import {
  LOADING_STEPS,
  columnCellValue,
  flagNote,
  isFlagged,
  parseCell,
} from "./data";

type Scene = "empty" | "loading" | "results";

const MIN_LOADING_MS = 4000;

type ColumnManagerProps = {
  columns: ColumnDefinition[];
  onChange: (columns: ColumnDefinition[]) => void;
};

function ColumnManager({ columns, onChange }: ColumnManagerProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColumnDefinition["type"]>("text");

  function addColumn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onChange([...columns, createCustomColumn(id, trimmed, type)]);
    setLabel("");
    setType("text");
  }

  function moveBy(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= columns.length) return;
    onChange(moveColumn(columns, columns[index].id, columns[target].id));
  }

  return (
    <section className="mx-auto mb-6 max-w-6xl rounded-3xl bg-[#faf6ef] px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Table columns</p>
          <p className="text-xs text-[#7c746a]">Drag to reorder, or add your own field before uploading.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(defaultColumns())}
          className="rounded-full border border-[#c4b8a6] px-3 py-1 text-xs text-[#5c564e]"
        >
          Reset defaults
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {columns.map((column, index) => (
          <div
            key={column.id}
            draggable
            onDragStart={() => setDraggedId(column.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedId) onChange(moveColumn(columns, draggedId, column.id));
              setDraggedId(null);
            }}
            className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
              draggedId === column.id ? "border-[#1c1917] bg-[#ece4d6]" : "border-[#d6d0c6]"
            }`}
            title="Drag to reorder"
          >
            <span className="cursor-grab px-1">{column.label}</span>
            <button type="button" onClick={() => moveBy(index, -1)} aria-label={`Move ${column.label} left`} className="px-1 text-[#7c746a]">‹</button>
            <button type="button" onClick={() => moveBy(index, 1)} aria-label={`Move ${column.label} right`} className="px-1 text-[#7c746a]">›</button>
            <button type="button" onClick={() => onChange(removeColumn(columns, column.id))} aria-label={`Delete ${column.label} column`} className="px-1 text-[#9c1c1c]">×</button>
          </div>
        ))}
      </div>
      <form onSubmit={addColumn} className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="new-column-label">New column name</label>
        <input
          id="new-column-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="New column name"
          className="rounded-full border border-[#c4b8a6] bg-transparent px-3 py-1.5 text-xs outline-none"
        />
        <label className="sr-only" htmlFor="new-column-type">New column type</label>
        <select id="new-column-type" value={type} onChange={(event) => setType(event.target.value as ColumnDefinition["type"])} className="rounded-full border border-[#c4b8a6] bg-transparent px-3 py-1.5 text-xs">
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>
        <button type="submit" className="rounded-full bg-[#1c1917] px-3 py-1.5 text-xs text-white">Add column</button>
      </form>
    </section>
  );
}

export function DemoApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scene, setScene] = useState<Scene>("empty");
  const [table, setTable] = useState<TrackerTable>(createTable);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [timerStep, setTimerStep] = useState(0);
  const [readStep, setReadStep] = useState(0);
  const [fileIndex, setFileIndex] = useState(1);
  const [fileCount, setFileCount] = useState(1);
  const [columns, setColumns] = useState<ColumnDefinition[]>(defaultColumns);

  useEffect(() => {
    if (scene !== "loading") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed < 1400) setTimerStep(0);
      else if (elapsed < 2800) setTimerStep(1);
      else setTimerStep(2);
    }, 200);
    return () => window.clearInterval(timer);
  }, [scene]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const { showSheet, label } = sheetStatus(table);
  const stepLabel = LOADING_STEPS[Math.max(timerStep, readStep)] ?? LOADING_STEPS[0];

  function pickFiles() {
    fileInputRef.current?.click();
  }

  function startOver() {
    setTable(resetTable());
    setScene("empty");
  }

  async function processFiles(fileList: File[]) {
    if (fileList.length === 0) return;
    setDragOver(false);
    setTimerStep(0);
    setReadStep(0);
    setFileIndex(1);
    setFileCount(fileList.length);
    setScene("loading");

    const fallbackScene: Scene =
      table.rows.length > 0 || table.messages.length > 0 ? "results" : "empty";
    const minWait = new Promise<void>((resolve) => {
      window.setTimeout(resolve, MIN_LOADING_MS);
    });

    try {
      const { readPo } = await import("@/read/read-po");
      const results: ReadResult[] = [];
      for (let i = 0; i < fileList.length; i++) {
        setFileIndex(i + 1);
        setReadStep(Math.min(2, Math.floor(((i + 1) / fileList.length) * 3)));
        const file = fileList[i];
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          results.push(await readPo(file.name, bytes));
        } catch {
          results.push({ file: file.name, kind: "issue", issue: "not-pdf" });
        }
      }
      await minWait;
      setTable((current) => addResults(current, results));
      setScene("results");
    } catch {
      await minWait;
      setScene(fallbackScene);
    }
  }

  function onEdit(rowIndex: number, column: ColumnDefinition, value: string) {
    if (column.source) {
      const parsed = parseCell(column.source, value);
      setTable((current) => editCell(current, rowIndex, column.source!, parsed as never));
    } else {
      setTable((current) => editCustomCell(current, rowIndex, column.id, parseColumnValue(column, value)));
    }
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

  const actions = (
    <div className="flex flex-wrap gap-2">
      {showSheet && (
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
      <button
        type="button"
        onClick={pickFiles}
        className={`rounded-full px-4 py-2 text-sm ${
          showSheet ? "text-[#5c564e]" : "bg-[#1c1917] text-white"
        }`}
      >
        Add more POs
      </button>
      <button
        type="button"
        onClick={startOver}
        className="rounded-full px-4 py-2 text-sm text-[#5c564e]"
      >
        Start over
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4efe6] px-6 pb-16 pt-12 text-[#1c1917]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void processFiles(files);
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

      {scene === "empty" && (
        <>
          <ColumnManager columns={columns} onChange={setColumns} />
          <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void processFiles(Array.from(e.dataTransfer.files));
          }}
          onClick={pickFiles}
          className={`mx-auto flex min-h-72 w-full max-w-3xl flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed px-8 text-center transition ${
            dragOver
              ? "border-[#1c1917] bg-[#ece4d6]"
              : "border-[#c4b8a6] bg-[#faf6ef]"
          }`}
        >
          <span className="font-serif text-2xl">Drop AEM purchase orders here</span>
          <span className="mt-3 max-w-sm text-sm text-[#5c564e]">
            files stay on your computer — or click to browse
          </span>
          </button>
        </>
      )}

      {scene === "loading" && (
        <div className="mx-auto max-w-md rounded-[2rem] bg-[#faf6ef] px-8 py-12 text-center shadow-sm">
          <p className="text-sm text-[#7c746a]">
            file {fileIndex} of {fileCount}
          </p>
          <p className="mt-4 font-serif text-3xl">{stepLabel}</p>
          <div className="mt-8 h-1 overflow-hidden rounded-full bg-[#e6ddd0]">
            <div className="h-full w-2/3 animate-pulse bg-[#1c1917]" />
          </div>
        </div>
      )}

      {scene === "results" && (
        <div className="mx-auto max-w-6xl space-y-6">
          <ColumnManager columns={columns} onChange={setColumns} />
          {table.messages.length > 0 && (
            <ul className="space-y-2 text-sm">
              {table.messages.map((m, i) => (
                <li
                  key={`${i}-${m.file}`}
                  className="rounded-2xl bg-[#f3e4e0] px-4 py-3 text-[#7a2e22]"
                >
                  <span className="font-medium">{m.file}</span> — {m.message}
                </li>
              ))}
            </ul>
          )}

          {showSheet && (
            <div className="overflow-hidden rounded-[1.5rem] bg-[#faf6ef] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm">{label}</p>
                {actions}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-max border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col.id}
                          className="border border-[#d6d0c6] px-3 py-2 text-left font-semibold whitespace-nowrap"
                          style={{
                            backgroundColor: col.headerBg,
                            color: col.headerFg,
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {columns.map((col) => {
                          const flagged = col.source ? isFlagged(row, col.source) : false;
                          return (
                            <td
                              key={col.id}
                              className="border border-[#e6ddd0] p-0 align-top"
                              style={{
                                backgroundColor: flagged ? "#FFC7CE" : "#faf6ef",
                              }}
                            >
                              <input
                                value={columnCellValue(row, col)}
                                onChange={(e) =>
                                  onEdit(rowIndex, col, e.target.value)
                                }
                                className="w-36 bg-transparent px-3 py-2 outline-none"
                                aria-label={`${col.label} row ${rowIndex + 1}`}
                              />
                              {flagged && (
                                <p className="px-3 pb-2 text-[11px] text-[#9c1c1c]">
                                  {col.source ? flagNote(row, col.source) : ""}
                                </p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!showSheet && actions}
        </div>
      )}

      {toast && (
        <div className="fixed top-6 right-6 rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

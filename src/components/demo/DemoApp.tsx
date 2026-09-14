"use client";

/**
 * Locked look: Quiet studio (variant A). Losing variants live on branch prototype/demo-look.
 * Dropped PDFs are read in the browser via readPo; nothing is uploaded.
 */

import { useEffect, useRef, useState } from "react";
import type { ReadResult } from "@/domain/types";
import type { TrackerTable } from "@/table/table";
import {
  addResults,
  createTable,
  editCell,
  flaggedCellCount,
  resetTable,
} from "@/table/table";
import { clipboardPayload } from "@/output/clipboard";
import {
  COLUMNS,
  FLAG_NOTE,
  LOADING_STEPS,
  cellValue,
  isFlagged,
  parseCell,
  type ColumnKey,
} from "./data";

type Scene = "empty" | "loading" | "results";

const MIN_LOADING_MS = 4000;

export function DemoApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scene, setScene] = useState<Scene>("empty");
  const [table, setTable] = useState<TrackerTable>(createTable);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [fileIndex, setFileIndex] = useState(1);
  const [fileCount, setFileCount] = useState(1);

  useEffect(() => {
    if (scene !== "loading") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed < 1400) setStepIndex(0);
      else if (elapsed < 2800) setStepIndex(1);
      else setStepIndex(2);
    }, 200);
    return () => window.clearInterval(timer);
  }, [scene]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const flagCount = flaggedCellCount(table);
  const stepLabel = LOADING_STEPS[stepIndex] ?? LOADING_STEPS[0];

  async function processFiles(fileList: File[]) {
    if (fileList.length === 0) return;
    setDragOver(false);
    setStepIndex(0);
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

  function onEdit(rowIndex: number, key: ColumnKey, value: string) {
    setTable((current) =>
      editCell(current, rowIndex, key, parseCell(key, value) as never),
    );
  }

  function onCopy() {
    const { html, plain } = clipboardPayload(table.rows);
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
      downloadExcel(table.rows),
    );
  }

  return (
    <div className="min-h-screen bg-[#f4efe6] px-6 pb-16 pt-12 text-[#1c1917]">
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
            onClick={() => fileInputRef.current?.click()}
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

          <div className="overflow-hidden rounded-[1.5rem] bg-[#faf6ef] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-sm">
                {flagCount === 0
                  ? "All cells look complete"
                  : `${flagCount} cell${flagCount === 1 ? "" : "s"} to check`}
              </p>
              <div className="flex flex-wrap gap-2">
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
                <button
                  type="button"
                  onClick={() => setScene("empty")}
                  className="rounded-full px-4 py-2 text-sm text-[#5c564e]"
                >
                  Add more POs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTable(resetTable());
                    setScene("empty");
                  }}
                  className="rounded-full px-4 py-2 text-sm text-[#5c564e]"
                >
                  Start over
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-max border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
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
                    <tr key={`${row.poNumber}-${row.line}`}>
                      {COLUMNS.map((col) => {
                        const flagged = isFlagged(row, col.key);
                        return (
                          <td
                            key={col.key}
                            className="border border-[#e6ddd0] p-0 align-top"
                            style={{
                              backgroundColor: flagged ? "#FFC7CE" : "#faf6ef",
                            }}
                          >
                            <input
                              value={cellValue(row, col.key)}
                              onChange={(e) =>
                                onEdit(rowIndex, col.key, e.target.value)
                              }
                              className="w-36 bg-transparent px-3 py-2 outline-none"
                              aria-label={`${col.label} line ${row.line}`}
                            />
                            {flagged && (
                              <p className="px-3 pb-2 text-[11px] text-[#9c1c1c]">
                                {FLAG_NOTE}
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

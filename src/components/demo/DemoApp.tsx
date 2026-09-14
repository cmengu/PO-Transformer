"use client";

/**
 * Locked look: Quiet studio (variant A). Losing variants live on branch prototype/demo-look.
 * Hard-coded invented rows until the parser is wired on Assembled demo deployed on Vercel.
 */

import { useEffect, useState } from "react";
import {
  COLUMNS,
  FILE_MESSAGES,
  FLAG_NOTE,
  INVENTED_ROWS,
  LOADING_STEPS,
  cellValue,
  isFlagged,
  type ColumnKey,
  type MockRow,
} from "./data";

type Scene = "empty" | "loading" | "results";

function cloneRows(): MockRow[] {
  return INVENTED_ROWS.map((row) => ({ ...row, flags: [...row.flags] }));
}

export function DemoApp() {
  const [scene, setScene] = useState<Scene>("empty");
  const [rows, setRows] = useState<MockRow[]>(cloneRows);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [fileIndex, setFileIndex] = useState(1);

  useEffect(() => {
    if (scene !== "loading") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed < 1400) {
        setStepIndex(0);
        setFileIndex(1);
      } else if (elapsed < 2800) {
        setStepIndex(1);
        setFileIndex(2);
      } else if (elapsed < 4000) {
        setStepIndex(2);
        setFileIndex(2);
      } else {
        window.clearInterval(timer);
        setScene("results");
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [scene]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const flagCount = rows.reduce((n, row) => n + row.flags.length, 0);
  const stepLabel = LOADING_STEPS[stepIndex] ?? LOADING_STEPS[0];

  function onEdit(id: string, key: string, value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, flags: [...row.flags] };
        const col = key as ColumnKey;
        if (col === "line") next.line = Number(value) || 0;
        else if (col === "qty" || col === "unitPrice" || col === "total") {
          next[col] = value === "" ? null : Number(value);
        } else if (col === "job" || col === "drawing" || col === "pur") {
          next[col] = value as "";
        } else {
          (next as Record<string, unknown>)[col] = value;
        }
        if (col === "project" || col === "rev" || col === "requested") {
          next.flags = next.flags.filter((f) => f !== col);
        }
        return next;
      }),
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
            setScene("loading");
          }}
          onClick={() => setScene("loading")}
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
      )}

      {scene === "loading" && (
        <div className="mx-auto max-w-md rounded-[2rem] bg-[#faf6ef] px-8 py-12 text-center shadow-sm">
          <p className="text-sm text-[#7c746a]">
            file {fileIndex} of 2
          </p>
          <p className="mt-4 font-serif text-3xl">{stepLabel}</p>
          <div className="mt-8 h-1 overflow-hidden rounded-full bg-[#e6ddd0]">
            <div className="h-full w-2/3 animate-pulse bg-[#1c1917]" />
          </div>
        </div>
      )}

      {scene === "results" && (
        <div className="mx-auto max-w-6xl space-y-6">
          <ul className="space-y-2 text-sm">
            {FILE_MESSAGES.map((m) => (
              <li
                key={m.file}
                className="rounded-2xl bg-[#f3e4e0] px-4 py-3 text-[#7a2e22]"
              >
                <span className="font-medium">{m.file}</span> — {m.text}
              </li>
            ))}
          </ul>

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
                  onClick={() => setToast("Copied — paste into your email")}
                  className="rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white"
                >
                  Copy table
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setToast("Download Excel is wired on the deploy ticket")
                  }
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
                    setRows(cloneRows());
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
                  {rows.map((row) => (
                    <tr key={row.id}>
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
                              onChange={(e) => onEdit(row.id, col.key, e.target.value)}
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

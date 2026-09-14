import {
  COLUMNS,
  FLAG_NOTE,
  cellValue,
  isFlagged,
} from "./data";
import type { DemoHandlers } from "./types";

export const variantCName = "Tracker sheet";

export function VariantC(p: DemoHandlers) {
  return (
    <div className="flex min-h-screen flex-col bg-[#1f2328] text-[#e8eaed]">
      <header className="flex items-center gap-6 border-b border-[#3c424a] bg-[#171a1e] px-4 py-2">
        <div>
          <p className="text-[10px] tracking-[0.18em] text-[#9aa0a6] uppercase">
            Tracker
          </p>
          <h1 className="text-sm font-semibold">PO Transformer</h1>
        </div>
        {p.scene !== "empty" && (
          <p className="text-xs text-[#9aa0a6]">
            {p.scene === "loading"
              ? `file ${p.fileIndex} of ${p.fileCount}`
              : `${p.flagCount} cells to check`}
          </p>
        )}
        <p className="ml-auto text-[11px] text-[#9aa0a6]">
          files stay on your computer
        </p>
      </header>

      {p.scene === "empty" && (
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            p.onDrag(true);
          }}
          onDragLeave={() => p.onDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            p.onDrag(false);
            p.onDropOrBrowse();
          }}
          onClick={p.onDropOrBrowse}
          className={`m-3 flex h-24 items-center justify-between rounded border px-6 ${
            p.dragOver
              ? "border-[#8ab4f8] bg-[#23282f]"
              : "border-[#5f6368] bg-[#2a3038]"
          }`}
        >
          <span>
            <span className="block text-sm font-medium">
              Drop AEM purchase orders here
            </span>
            <span className="text-xs text-[#9aa0a6]">
              files stay on your computer — or click to browse
            </span>
          </span>
          <span className="rounded bg-[#8ab4f8] px-3 py-1 text-xs font-semibold text-[#171a1e]">
            Browse
          </span>
        </button>
      )}

      {p.scene === "loading" && (
        <div className="flex flex-1 items-center justify-center">
          <div className="w-[420px] rounded border border-[#3c424a] bg-[#171a1e] p-6">
            <div className="mb-4 h-2 overflow-hidden rounded bg-[#2a3038]">
              <div className="h-full w-1/2 bg-[#8ab4f8]" />
            </div>
            <p className="font-mono text-sm">{p.stepLabel}</p>
            <p className="mt-2 font-mono text-xs text-[#9aa0a6]">
              file {p.fileIndex} of {p.fileCount}
            </p>
          </div>
        </div>
      )}

      {p.scene === "results" && (
        <>
          {p.messages.length > 0 && (
            <div className="flex gap-3 overflow-x-auto border-b border-[#3c424a] bg-[#2a1816] px-4 py-2 text-xs text-[#f28b82]">
              {p.messages.map((m) => (
                <span key={m.file} className="whitespace-nowrap">
                  {m.file}: {m.text}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 border-b border-[#3c424a] bg-[#171a1e] px-3 py-2">
            <button
              type="button"
              onClick={p.onCopy}
              className="rounded bg-[#8ab4f8] px-3 py-1 text-xs font-semibold text-[#171a1e]"
            >
              Copy table
            </button>
            <button
              type="button"
              onClick={p.onDownload}
              className="rounded border border-[#5f6368] px-3 py-1 text-xs"
            >
              Download Excel
            </button>
            <button
              type="button"
              onClick={p.onAddMore}
              className="px-3 py-1 text-xs text-[#9aa0a6]"
            >
              Add more POs
            </button>
            <button
              type="button"
              onClick={p.onStartOver}
              className="px-3 py-1 text-xs text-[#9aa0a6]"
            >
              Start over
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-[#171a1e]">
            <table className="min-w-max border-separate border-spacing-0 font-mono text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="border border-[#5f6368] px-2 py-1 text-left font-bold whitespace-nowrap"
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
                {p.rows.map((row) => (
                  <tr key={row.id}>
                    {COLUMNS.map((col) => {
                      const flagged = isFlagged(row, col.key);
                      return (
                        <td
                          key={col.key}
                          className="border border-[#3c424a] p-0"
                          style={{
                            backgroundColor: flagged ? "#FFC7CE" : "#20242a",
                            color: flagged ? "#1c1917" : "#e8eaed",
                          }}
                        >
                          <input
                            value={cellValue(row, col.key)}
                            onChange={(e) =>
                              p.onEdit(row.id, col.key, e.target.value)
                            }
                            className="w-28 bg-transparent px-2 py-1 outline-none"
                          />
                          {flagged && (
                            <p className="px-2 pb-1 text-[10px] text-[#9c1c1c]">
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
        </>
      )}

      {p.toast && (
        <div className="fixed right-4 bottom-24 rounded border border-[#3c424a] bg-[#171a1e] px-3 py-2 text-xs">
          {p.toast}
        </div>
      )}
    </div>
  );
}

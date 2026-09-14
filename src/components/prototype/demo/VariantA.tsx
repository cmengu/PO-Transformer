import {
  COLUMNS,
  FLAG_NOTE,
  cellValue,
  isFlagged,
} from "./data";
import type { DemoHandlers } from "./types";

export const variantAName = "Quiet studio";

export function VariantA(p: DemoHandlers) {
  return (
    <div className="min-h-screen bg-[#f4efe6] px-6 pb-28 pt-12 text-[#1c1917]">
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
          className={`mx-auto flex min-h-72 w-full max-w-3xl flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed px-8 text-center transition ${
            p.dragOver
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

      {p.scene === "loading" && (
        <div className="mx-auto max-w-md rounded-[2rem] bg-[#faf6ef] px-8 py-12 text-center shadow-sm">
          <p className="text-sm text-[#7c746a]">
            file {p.fileIndex} of {p.fileCount}
          </p>
          <p className="mt-4 font-serif text-3xl">{p.stepLabel}</p>
          <div className="mt-8 h-1 overflow-hidden rounded-full bg-[#e6ddd0]">
            <div className="h-full w-2/3 animate-pulse bg-[#1c1917]" />
          </div>
        </div>
      )}

      {p.scene === "results" && (
        <div className="mx-auto max-w-6xl space-y-6">
          {p.messages.length > 0 && (
            <ul className="space-y-2 text-sm">
              {p.messages.map((m) => (
                <li
                  key={m.file}
                  className="rounded-2xl bg-[#f3e4e0] px-4 py-3 text-[#7a2e22]"
                >
                  <span className="font-medium">{m.file}</span> — {m.text}
                </li>
              ))}
            </ul>
          )}

          <div className="overflow-hidden rounded-[1.5rem] bg-[#faf6ef] shadow-sm">
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm">
                {p.flagCount === 0
                  ? "All cells look complete"
                  : `${p.flagCount} cell${p.flagCount === 1 ? "" : "s"} to check`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={p.onCopy}
                  className="rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white"
                >
                  Copy table
                </button>
                <button
                  type="button"
                  onClick={p.onDownload}
                  className="rounded-full border border-[#1c1917] px-4 py-2 text-sm"
                >
                  Download Excel
                </button>
                <button
                  type="button"
                  onClick={p.onAddMore}
                  className="rounded-full px-4 py-2 text-sm text-[#5c564e]"
                >
                  Add more POs
                </button>
                <button
                  type="button"
                  onClick={p.onStartOver}
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
                  {p.rows.map((row) => (
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
                              onChange={(e) =>
                                p.onEdit(row.id, col.key, e.target.value)
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

      {p.toast && (
        <div className="fixed top-6 right-6 rounded-full bg-[#1c1917] px-4 py-2 text-sm text-white">
          {p.toast}
        </div>
      )}
    </div>
  );
}

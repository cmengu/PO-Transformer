import {
  COLUMNS,
  FLAG_NOTE,
  GOOD_FILES,
  cellValue,
  isFlagged,
} from "./data";
import type { DemoHandlers } from "./types";

export const variantBName = "Mail room";

export function VariantB(p: DemoHandlers) {
  return (
    <div className="flex min-h-screen bg-[#ece7df] text-[#241c14]">
      <aside className="flex w-72 shrink-0 flex-col border-r border-[#d3c7b4] bg-[#f7f1e6]">
        <div className="border-b border-[#d3c7b4] px-5 py-5">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase">
            Inbox
          </p>
          <h1 className="mt-1 text-xl font-semibold">PO Transformer</h1>
          <p className="mt-2 text-xs leading-5 text-[#6b5e4e]">
            Files stay on your computer. Drop several POs; one table comes out.
          </p>
        </div>

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
            className={`m-4 flex flex-1 flex-col items-start justify-end rounded-md border px-4 py-6 text-left ${
              p.dragOver
                ? "border-[#241c14] bg-[#efe6d4]"
                : "border-dashed border-[#b9a88d] bg-[#fffaf1]"
            }`}
          >
            <span className="text-sm font-semibold">
              Drop AEM purchase orders here
            </span>
            <span className="mt-2 text-xs text-[#6b5e4e]">
              files stay on your computer — or click to browse
            </span>
          </button>
        )}

        {p.scene !== "empty" && (
          <div className="flex-1 overflow-auto px-4 py-4 text-sm">
            <p className="mb-2 text-[11px] font-semibold tracking-wide uppercase text-[#6b5e4e]">
              This drop
            </p>
            {GOOD_FILES.map((file) => (
              <p key={file} className="truncate py-1">
                {file}
              </p>
            ))}
            {p.messages.map((m) => (
              <p key={m.file} className="mt-2 text-[#8a2a1b]">
                {m.file}
                <span className="mt-0.5 block text-xs">{m.text}</span>
              </p>
            ))}
          </div>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {p.scene === "empty" && (
          <div className="m-auto max-w-md px-8 text-center text-[#6b5e4e]">
            <p className="text-2xl font-semibold text-[#241c14]">
              Waiting for POs
            </p>
            <p className="mt-3 text-sm">
              Use the tray on the left. After reading, rows land here in tracker
              column order.
            </p>
          </div>
        )}

        {p.scene === "loading" && (
          <div className="m-auto w-full max-w-lg px-10">
            <p className="text-xs uppercase tracking-widest text-[#6b5e4e]">
              file {p.fileIndex} of {p.fileCount}
            </p>
            <p className="mt-3 text-3xl font-semibold">{p.stepLabel}</p>
            <ol className="mt-8 space-y-3 text-sm">
              {["Reading PO…", "Extracting lines…", "Building sheet…"].map(
                (label) => (
                  <li
                    key={label}
                    className={
                      label === p.stepLabel
                        ? "font-semibold text-[#241c14]"
                        : "text-[#9a8d7b]"
                    }
                  >
                    {label}
                  </li>
                ),
              )}
            </ol>
          </div>
        )}

        {p.scene === "results" && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-[#d3c7b4] bg-[#fffaf1] px-4 py-3">
              <p className="text-sm font-medium">
                {p.flagCount} cell{p.flagCount === 1 ? "" : "s"} to check
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={p.onCopy}
                  className="bg-[#241c14] px-3 py-1.5 text-sm text-[#fffaf1]"
                >
                  Copy table
                </button>
                <button
                  type="button"
                  onClick={p.onDownload}
                  className="border border-[#241c14] px-3 py-1.5 text-sm"
                >
                  Download Excel
                </button>
                <button type="button" onClick={p.onAddMore} className="px-3 py-1.5 text-sm">
                  Add more POs
                </button>
                <button
                  type="button"
                  onClick={p.onStartOver}
                  className="px-3 py-1.5 text-sm"
                >
                  Start over
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="min-w-max border-collapse text-xs">
                <thead className="sticky top-0">
                  <tr>
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="border border-[#cfc5b4] px-2 py-2 text-left font-bold whitespace-nowrap"
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
                  {p.rows.map((row, idx) => {
                    const prev = p.rows[idx - 1];
                    const poBreak = prev && prev.poNumber !== row.poNumber;
                    return (
                      <tr
                        key={row.id}
                        className={poBreak ? "border-t-4 border-[#241c14]" : ""}
                      >
                        {COLUMNS.map((col) => {
                          const flagged = isFlagged(row, col.key);
                          return (
                            <td
                              key={col.key}
                              className="border border-[#e4dccf] p-0"
                              style={{
                                backgroundColor: flagged ? "#FFC7CE" : "#fffaf1",
                              }}
                            >
                              <input
                                value={cellValue(row, col.key)}
                                onChange={(e) =>
                                  p.onEdit(row.id, col.key, e.target.value)
                                }
                                className="w-32 bg-transparent px-2 py-1.5 outline-none"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {p.toast && (
        <div className="fixed right-6 bottom-24 bg-[#241c14] px-4 py-2 text-sm text-[#fffaf1]">
          {p.toast}
        </div>
      )}
    </div>
  );
}

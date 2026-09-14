import type { TrackerRow } from "@/domain/types";

export const COLUMNS = [
  { key: "job", label: "Job#", headerBg: "#FFD966", headerFg: "#C00000" },
  {
    key: "drawing",
    label: "Engineering drawing#",
    headerBg: "#FFD966",
    headerFg: "#C00000",
  },
  { key: "poDate", label: "PO Date", headerBg: "#FFD966", headerFg: "#000000" },
  { key: "poNumber", label: "PO #", headerBg: "#FFD966", headerFg: "#000000" },
  { key: "line", label: "Line", headerBg: "#FFD966", headerFg: "#000000" },
  { key: "pur", label: "Pur", headerBg: "#FFD966", headerFg: "#C00000" },
  {
    key: "project",
    label: "Project Number",
    headerBg: "#FFD966",
    headerFg: "#C00000",
  },
  { key: "rev", label: "Rev", headerBg: "#FFD966", headerFg: "#C00000" },
  {
    key: "description",
    label: "Description",
    headerBg: "#FFD966",
    headerFg: "#000000",
  },
  { key: "qty", label: "PO Qty", headerBg: "#7FF5EA", headerFg: "#000000" },
  {
    key: "requested",
    label: "Requested Date",
    headerBg: "#FFD966",
    headerFg: "#C00000",
  },
  {
    key: "unitPrice",
    label: "Unit Price",
    headerBg: "#D9D9D9",
    headerFg: "#000000",
  },
  {
    key: "total",
    label: "Total Price",
    headerBg: "#D9D9D9",
    headerFg: "#000000",
  },
] as const;

export type ColumnKey = (typeof COLUMNS)[number]["key"];

export const LOADING_STEPS = [
  "Reading PO…",
  "Extracting lines…",
  "Building sheet…",
] as const;

export const FLAG_NOTE = "Not found on PO — please check";

export function cellValue(row: TrackerRow, key: ColumnKey): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  return String(value);
}

export function isFlagged(row: TrackerRow, key: ColumnKey): boolean {
  return (
    (key === "project" || key === "rev" || key === "requested") &&
    row.flags.includes(key)
  );
}

export function parseCell(key: ColumnKey, value: string): TrackerRow[ColumnKey] {
  if (key === "line") return Number(value) || 0;
  if (key === "qty" || key === "unitPrice" || key === "total") {
    if (value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return value as TrackerRow[typeof key];
}

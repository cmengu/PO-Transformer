import type { DateField, ObscuredPriceField, TrackerRow } from "../../domain/types";
import { cellNeedsAttention, isMissingRequiredValue, type RequiredCellField } from "../../domain/validation";
import {
  DEFAULT_COLUMNS,
  columnValue,
  type BuiltInColumnKey,
  type ColumnDefinition,
} from "../../table/columns";

export const COLUMNS = DEFAULT_COLUMNS;
export type ColumnKey = BuiltInColumnKey;

export const LOADING_STEPS = [
  "Reading PO…",
  "Extracting lines…",
  "Building sheet…",
] as const;

export const FLAG_NOTE = "Not found on PO — please check";
const OBSCURED_NOTE = "Visually obscured in PDF — not imported";

export function cellValue(row: TrackerRow, key: ColumnKey): string {
  return columnValue(row, { id: key, source: key, label: "", type: "text", headerBg: "", headerFg: "" });
}

export function columnCellValue(row: TrackerRow, column: ColumnDefinition): string {
  return columnValue(row, column);
}

export function isFlagged(row: TrackerRow, key: ColumnKey): boolean {
  if (key === "job" || key === "drawing") return false;
  return cellNeedsAttention(row, key as RequiredCellField);
}

export function flagNote(row: TrackerRow, key: ColumnKey): string {
  if (key === "poDate" || key === "requested") {
    const issue = row.dateIssues?.[key as DateField];
    if (issue?.kind === "invalid") {
      return `Invalid date${issue.raw ? `: ${issue.raw}` : ""} — enter DD/MM/YYYY`;
    }
    if (issue?.kind === "missing") return "Date unavailable — please check PO";
  }
  if (key !== "job" && key !== "drawing" && isMissingRequiredValue(row, key as RequiredCellField)) {
    return "Missing data — please check PO";
  }
  return row.obscured?.includes(key as ObscuredPriceField)
    ? OBSCURED_NOTE
    : FLAG_NOTE;
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

export type Flag = "project" | "rev" | "requested";

export type MockRow = {
  id: string;
  job: "";
  drawing: "";
  pur: "";
  poDate: string;
  poNumber: string;
  line: number;
  project: string;
  rev: string;
  description: string;
  qty: number | null;
  requested: string;
  unitPrice: number | null;
  total: number | null;
  flags: Flag[];
};

export type FileMessage = {
  file: string;
  text: string;
};

export const COLUMNS = [
  { key: "job", label: "Job#", headerBg: "#FFD966", headerFg: "#C00000" },
  {
    key: "drawing",
    label: "Engineering drawing#",
    headerBg: "#FFD966",
    headerFg: "#C00000",
  },
  { key: "poDate", label: "PO Date", headerBg: "#FFD966", headerFg: "#000000" },
  { key: "poNumber", label: "PO#", headerBg: "#FFD966", headerFg: "#000000" },
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

export const INVENTED_ROWS: MockRow[] = [
  {
    id: "a10",
    job: "",
    drawing: "",
    pur: "",
    poDate: "03/09/2026",
    poNumber: "4500099001",
    line: 10,
    project: "B9001-XX100",
    rev: "03",
    description: "BRACKET PLATE",
    qty: 50,
    requested: "20/12/2026",
    unitPrice: 12.5,
    total: 625,
    flags: [],
  },
  {
    id: "a20",
    job: "",
    drawing: "",
    pur: "",
    poDate: "03/09/2026",
    poNumber: "4500099001",
    line: 20,
    project: "B9002-YY200",
    rev: "01",
    description: "CABLE CLIP SP2",
    qty: 1200,
    requested: "",
    unitPrice: 0.85,
    total: 1020,
    flags: ["requested"],
  },
  {
    id: "b10",
    job: "",
    drawing: "",
    pur: "",
    poDate: "11/09/2026",
    poNumber: "4500099002",
    line: 10,
    project: "C4400-ZZ010",
    rev: "",
    description: "SENSOR MOUNT",
    qty: 8,
    requested: "05/01/2027",
    unitPrice: 140,
    total: 1120,
    flags: ["rev"],
  },
];

export const FILE_MESSAGES: FileMessage[] = [
  { file: "scan-copy.pdf", text: "Can't be read — looks scanned" },
  { file: "notes.docx", text: "Not a PDF" },
  { file: "delivery-note.pdf", text: "Not an AEM purchase order" },
];

export const GOOD_FILES = ["PO-4500099001.pdf", "PO-4500099002.pdf"];

export const LOADING_STEPS = [
  "Reading PO…",
  "Extracting lines…",
  "Building sheet…",
] as const;

export const FLAG_NOTE = "Not found on PO — please check";

export function cellValue(row: MockRow, key: ColumnKey): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  return String(value);
}

export function isFlagged(row: MockRow, key: ColumnKey): boolean {
  return (
    (key === "project" && row.flags.includes("project")) ||
    (key === "rev" && row.flags.includes("rev")) ||
    (key === "requested" && row.flags.includes("requested"))
  );
}

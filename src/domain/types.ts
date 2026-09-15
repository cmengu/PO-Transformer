export type ObscuredPriceField = 'unitPrice' | 'total'
export type DateField = 'poDate' | 'requested'
export type DateIssueKind = 'missing' | 'invalid'

export type DateIssue = {
  kind: DateIssueKind
  raw?: string
}

export type TrackerRow = {
  job: ''
  drawing: ''
  pur: string
  poDate: string
  poNumber: string
  line: number
  project: string
  rev: string
  description: string
  qty: number | null
  unitPrice: number | null
  total: number | null
  requested: string
  flags: Array<'project' | 'rev' | 'requested'>
  /** Values present in the text layer but hidden by a later page image. */
  obscured?: ObscuredPriceField[]
  /** Date values that need explicit user attention. */
  dateIssues?: Partial<Record<DateField, DateIssue>>
  /** Values entered into user-created columns. */
  customValues?: Record<string, string | number | null>
}

export type ReadResult =
  | { file: string; kind: 'rows'; rows: TrackerRow[] }
  | { file: string; kind: 'issue'; issue: 'not-pdf' | 'no-text' | 'not-aem' }

export type ClipboardPayload = {
  html: string
  plain: string
}

export type ExcelFile = {
  blob: Blob
  fileName: string
}

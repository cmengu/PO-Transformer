export type ObscuredPriceField = 'unitPrice' | 'total'

export type TrackerRow = {
  job: ''
  drawing: ''
  pur: ''
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

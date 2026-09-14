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
}

export type ClipboardPayload = {
  html: string
  plain: string
}

export type ExcelFile = {
  blob: Blob
  fileName: string
}

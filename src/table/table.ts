import type { ReadResult, TrackerRow } from '../domain/types'
import { requestedDate } from '../domain/dates'

export type FileMessage = {
  file: string
  message: string
}

export type TrackerTable = {
  rows: TrackerRow[]
  messages: FileMessage[]
}

export function createTable(): TrackerTable {
  return { rows: [], messages: [] }
}

export function resetTable(): TrackerTable {
  return createTable()
}

export function addResults(table: TrackerTable, results: ReadResult[]): TrackerTable {
  const rows = [...table.rows]
  const messages = [...table.messages]
  const seen = new Set(rows.map((row) => row.poNumber))

  for (const result of results) {
    if (result.kind !== 'rows') {
      messages.push({ file: result.file, message: issueMessage(result.issue) })
      continue
    }
    const poNumber = result.rows[0]?.poNumber
    if (poNumber && seen.has(poNumber)) {
      messages.push({ file: result.file, message: 'Already in the table' })
      continue
    }
    if (poNumber) seen.add(poNumber)
    const sorted = [...result.rows].sort((a, b) => a.line - b.line)
    rows.push(...sorted)
  }

  return { rows, messages }
}

export function flaggedCellCount(table: TrackerTable): number {
  return table.rows.reduce((n, row) => n + row.flags.length, 0)
}

export function sheetStatus(table: TrackerTable): {
  showSheet: boolean
  label: string | null
} {
  if (table.rows.length === 0) return { showSheet: false, label: null }
  const n = flaggedCellCount(table)
  return {
    showSheet: true,
    label:
      n === 0
        ? 'All cells look complete'
        : `${n} cell${n === 1 ? '' : 's'} to check`,
  }
}

function issueMessage(issue: 'not-pdf' | 'no-text' | 'not-aem'): string {
  if (issue === 'not-pdf') return 'Not a PDF'
  if (issue === 'no-text') return "Can't be read — looks scanned"
  return 'Not an AEM purchase order'
}

export function editCell<K extends keyof TrackerRow>(
  table: TrackerTable,
  rowIndex: number,
  field: K,
  value: TrackerRow[K],
): TrackerTable {
  const rows = table.rows.map((row, index) => {
    if (index !== rowIndex) return row
    const next: TrackerRow = { ...row, [field]: value }
    if (field === 'project' || field === 'rev' || field === 'requested') {
      const text = String(value ?? '')
      const requiresReview = field === 'requested' ? requestedDate(text).flag : text.trim() === ''
      next.flags = row.flags.filter((flag) => flag !== field)
      if (requiresReview) next.flags.push(field)
    }
    return next
  })
  return { ...table, rows }
}

import type { DateField, ObscuredPriceField, TrackerRow } from '../domain/types'

export type BuiltInColumnKey =
  | 'job'
  | 'drawing'
  | 'poDate'
  | 'poNumber'
  | 'line'
  | 'pur'
  | 'project'
  | 'rev'
  | 'description'
  | 'qty'
  | 'requested'
  | 'unitPrice'
  | 'total'

export type ColumnType = 'text' | 'number' | 'date'

export type ColumnDefinition = {
  id: string
  label: string
  source?: BuiltInColumnKey
  type: ColumnType
  headerBg: string
  headerFg: string
}

export type ColumnLayout = {
  /** Columns currently visible in the tracker and exports, in display order. */
  columns: ColumnDefinition[]
  /** Built-in columns the user has chosen to hide, kept so they can be restored. */
  hiddenBuiltInColumns: ColumnDefinition[]
}

const RED = '#C00000'
const YELLOW = '#FFD966'
const CYAN = '#7FF5EA'
const GREY = '#D9D9D9'
const BLACK = '#000000'

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'job', source: 'job', label: 'Job#', type: 'text', headerBg: YELLOW, headerFg: RED },
  { id: 'drawing', source: 'drawing', label: 'Engineering drawing#', type: 'text', headerBg: YELLOW, headerFg: RED },
  { id: 'poDate', source: 'poDate', label: 'PO Date', type: 'date', headerBg: YELLOW, headerFg: BLACK },
  { id: 'poNumber', source: 'poNumber', label: 'PO #', type: 'text', headerBg: YELLOW, headerFg: BLACK },
  { id: 'line', source: 'line', label: 'Line', type: 'number', headerBg: YELLOW, headerFg: BLACK },
  { id: 'pur', source: 'pur', label: 'Pur', type: 'text', headerBg: YELLOW, headerFg: RED },
  { id: 'project', source: 'project', label: 'Project Number', type: 'text', headerBg: YELLOW, headerFg: RED },
  { id: 'rev', source: 'rev', label: 'Rev', type: 'text', headerBg: YELLOW, headerFg: RED },
  { id: 'description', source: 'description', label: 'Description', type: 'text', headerBg: YELLOW, headerFg: BLACK },
  { id: 'qty', source: 'qty', label: 'PO Qty', type: 'number', headerBg: CYAN, headerFg: BLACK },
  { id: 'requested', source: 'requested', label: 'Requested Date', type: 'date', headerBg: YELLOW, headerFg: RED },
  { id: 'unitPrice', source: 'unitPrice', label: 'Unit Price', type: 'number', headerBg: GREY, headerFg: BLACK },
  { id: 'total', source: 'total', label: 'Total Price', type: 'number', headerBg: GREY, headerFg: BLACK },
]

export function defaultColumns(): ColumnDefinition[] {
  return DEFAULT_COLUMNS.map((column) => ({ ...column }))
}

export function defaultColumnLayout(): ColumnLayout {
  return { columns: defaultColumns(), hiddenBuiltInColumns: [] }
}

export function isBuiltInColumn(column: ColumnDefinition): boolean {
  return column.source !== undefined
}

export function createCustomColumn(id: string, label: string, type: ColumnType = 'text'): ColumnDefinition {
  return {
    id,
    label,
    type,
    headerBg: YELLOW,
    headerFg: BLACK,
  }
}

export function moveColumn(columns: ColumnDefinition[], id: string, targetId: string): ColumnDefinition[] {
  const from = columns.findIndex((column) => column.id === id)
  const target = columns.findIndex((column) => column.id === targetId)
  if (from < 0 || target < 0 || from === target) return columns
  const next = [...columns]
  const [column] = next.splice(from, 1)
  next.splice(target, 0, column)
  return next
}

export function removeColumn(columns: ColumnDefinition[], id: string): ColumnDefinition[] {
  return columns.filter((column) => column.id !== id)
}

export function moveColumnToIndex(
  columns: ColumnDefinition[],
  id: string,
  targetIndex: number,
): ColumnDefinition[] {
  const from = columns.findIndex((column) => column.id === id)
  if (from < 0) return columns
  const next = [...columns]
  const [column] = next.splice(from, 1)
  const insertionIndex = Math.max(0, Math.min(targetIndex, next.length))
  next.splice(insertionIndex, 0, column)
  return next
}

export function moveColumnAround(
  columns: ColumnDefinition[],
  id: string,
  targetId: string,
  position: 'before' | 'after',
): ColumnDefinition[] {
  if (id === targetId) return columns
  const withoutDragged = columns.filter((column) => column.id !== id)
  const targetIndex = withoutDragged.findIndex((column) => column.id === targetId)
  if (targetIndex < 0) return columns
  return moveColumnToIndex(
    columns,
    id,
    position === 'before' ? targetIndex : targetIndex + 1,
  )
}

export function hideBuiltInColumn(layout: ColumnLayout, id: string): ColumnLayout {
  const column = layout.columns.find((candidate) => candidate.id === id)
  if (!column || !isBuiltInColumn(column)) return layout
  if (layout.columns.length === 1) return layout
  return {
    columns: layout.columns.filter((candidate) => candidate.id !== id),
    hiddenBuiltInColumns: [...layout.hiddenBuiltInColumns, column],
  }
}

export function restoreBuiltInColumn(layout: ColumnLayout, id: string): ColumnLayout {
  const column = layout.hiddenBuiltInColumns.find((candidate) => candidate.id === id)
  if (!column) return layout
  const defaultIndex = DEFAULT_COLUMNS.findIndex((candidate) => candidate.id === id)
  const nextVisibleIndex = layout.columns.findIndex((candidate) => {
    const candidateIndex = DEFAULT_COLUMNS.findIndex((item) => item.id === candidate.id)
    return candidateIndex > defaultIndex
  })
  const insertAt = nextVisibleIndex < 0 ? layout.columns.length : nextVisibleIndex
  return {
    columns: [
      ...layout.columns.slice(0, insertAt),
      column,
      ...layout.columns.slice(insertAt),
    ],
    hiddenBuiltInColumns: layout.hiddenBuiltInColumns.filter(
      (candidate) => candidate.id !== id,
    ),
  }
}

export function columnLabelError(
  columns: ColumnDefinition[],
  label: string,
  exceptId?: string,
): string | null {
  const trimmed = label.trim()
  if (!trimmed) return 'Enter a column name'
  if (
    columns.some(
      (column) =>
        column.id !== exceptId &&
        column.label.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  ) {
    return 'A column with this name already exists'
  }
  return null
}

export function renameCustomColumn(
  columns: ColumnDefinition[],
  id: string,
  label: string,
): ColumnDefinition[] {
  const column = columns.find((candidate) => candidate.id === id)
  if (!column || isBuiltInColumn(column) || columnLabelError(columns, label, id)) {
    return columns
  }
  return columns.map((candidate) =>
    candidate.id === id ? { ...candidate, label: label.trim() } : candidate,
  )
}

export function deleteCustomColumn(
  columns: ColumnDefinition[],
  id: string,
): ColumnDefinition[] {
  const column = columns.find((candidate) => candidate.id === id)
  if (!column || isBuiltInColumn(column)) return columns
  return removeColumn(columns, id)
}

export function columnValue(row: TrackerRow, column: ColumnDefinition): string {
  const value = column.source ? row[column.source] : row.customValues?.[column.id]
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Whether a source-backed column contains a value that still needs review. */
export function columnFlagged(row: TrackerRow, column: ColumnDefinition): boolean {
  const source = column.source
  if (!source) return false
  if (source === 'poDate' || source === 'requested') {
    return row.dateIssues?.[source as DateField] !== undefined ||
      (source === 'requested' && row.flags.includes('requested'))
  }
  if (source === 'project' || source === 'rev') return row.flags.includes(source)
  if (source === 'unitPrice' || source === 'total') {
    return row.obscured?.includes(source as ObscuredPriceField) === true
  }
  return false
}

export function parseColumnValue(column: ColumnDefinition, raw: string): string | number | null {
  if (column.type === 'number') {
    if (raw.trim() === '') return null
    const value = Number(raw.replace(/,/g, ''))
    return Number.isFinite(value) ? value : null
  }
  return raw
}

import {
  DEFAULT_COLUMNS,
  defaultColumnLayout,
  isBuiltInColumn,
  type ColumnDefinition,
  type ColumnLayout,
  type ColumnType,
} from './columns'

export const COLUMN_PREFERENCES_KEY = 'po-transformer.column-preferences.v1'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type StoredColumnLayout = {
  version: 1
  columns: ColumnDefinition[]
  hiddenBuiltInColumns: ColumnDefinition[]
}

const COLUMN_TYPES: ColumnType[] = ['text', 'number', 'date']

function isColumnType(value: unknown): value is ColumnType {
  return typeof value === 'string' && COLUMN_TYPES.includes(value as ColumnType)
}

function columnFromUnknown(value: unknown): ColumnDefinition | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ColumnDefinition>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.label !== 'string' ||
    !isColumnType(candidate.type) ||
    typeof candidate.headerBg !== 'string' ||
    typeof candidate.headerFg !== 'string'
  ) {
    return null
  }
  const defaultColumn = DEFAULT_COLUMNS.find((column) => column.id === candidate.id)
  if (defaultColumn) return { ...defaultColumn }
  if (candidate.source !== undefined) return null
  return {
    id: candidate.id,
    label: candidate.label,
    type: candidate.type,
    headerBg: candidate.headerBg,
    headerFg: candidate.headerFg,
  }
}

function columnsFromUnknown(value: unknown): ColumnDefinition[] | null {
  if (!Array.isArray(value)) return null
  const columns = value.map(columnFromUnknown)
  if (columns.some((column) => column === null)) return null
  const ids = columns.map((column) => column!.id)
  if (new Set(ids).size !== ids.length) return null
  return columns as ColumnDefinition[]
}

function normaliseLayout(
  columns: ColumnDefinition[],
  hiddenBuiltInColumns: ColumnDefinition[],
): ColumnLayout {
  const visible = columns.filter((column) => {
    if (!isBuiltInColumn(column)) return true
    return DEFAULT_COLUMNS.some((defaultColumn) => defaultColumn.id === column.id)
  })
  const hidden = hiddenBuiltInColumns.filter(
    (column) =>
      isBuiltInColumn(column) &&
      !visible.some((visibleColumn) => visibleColumn.id === column.id),
  )
  const accountedFor = new Set([...visible, ...hidden].map((column) => column.id))
  for (const defaultColumn of DEFAULT_COLUMNS) {
    if (!accountedFor.has(defaultColumn.id)) visible.push({ ...defaultColumn })
  }
  return { columns: visible, hiddenBuiltInColumns: hidden }
}

export function loadColumnLayout(storage: StorageLike): ColumnLayout {
  try {
    const raw = storage.getItem(COLUMN_PREFERENCES_KEY)
    if (!raw) return defaultColumnLayout()
    const parsed = JSON.parse(raw) as Partial<StoredColumnLayout>
    if (parsed.version !== 1) return defaultColumnLayout()
    const columns = columnsFromUnknown(parsed.columns)
    const hidden = columnsFromUnknown(parsed.hiddenBuiltInColumns)
    if (!columns || !hidden) return defaultColumnLayout()
    return normaliseLayout(columns, hidden)
  } catch {
    return defaultColumnLayout()
  }
}

export function saveColumnLayout(storage: StorageLike, layout: ColumnLayout): void {
  const value: StoredColumnLayout = {
    version: 1,
    columns: layout.columns,
    hiddenBuiltInColumns: layout.hiddenBuiltInColumns,
  }
  try {
    storage.setItem(COLUMN_PREFERENCES_KEY, JSON.stringify(value))
  } catch {
    // A private-browser quota error should not prevent users from using the table.
  }
}

export function resetColumnLayout(storage: StorageLike): ColumnLayout {
  try {
    storage.removeItem(COLUMN_PREFERENCES_KEY)
  } catch {
    // The in-memory reset remains useful when persistent storage is unavailable.
  }
  return defaultColumnLayout()
}

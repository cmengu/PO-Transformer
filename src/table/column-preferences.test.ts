import { describe, expect, it } from 'vitest'
import {
  COLUMN_PREFERENCES_KEY,
  loadColumnLayout,
  resetColumnLayout,
  saveColumnLayout,
} from './column-preferences'
import { createCustomColumn, defaultColumnLayout, hideBuiltInColumn, moveColumn } from './columns'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

describe('column preferences', () => {
  it('uses defaults when no preferences have been saved', () => {
    const layout = loadColumnLayout(new MemoryStorage())
    expect(layout).toEqual(defaultColumnLayout())
  })

  it('persists reordered, hidden, and custom columns', () => {
    const storage = new MemoryStorage()
    const defaults = defaultColumnLayout()
    const hidden = hideBuiltInColumn({
      ...defaults,
      columns: [
        ...moveColumn(defaults.columns, 'total', 'job'),
        createCustomColumn('customer', 'Customer'),
      ],
    }, 'drawing')

    saveColumnLayout(storage, hidden)
    expect(loadColumnLayout(storage)).toEqual(hidden)
  })

  it('falls back safely for malformed or unsupported saved values', () => {
    const storage = new MemoryStorage()
    storage.setItem(COLUMN_PREFERENCES_KEY, '{broken json')
    expect(loadColumnLayout(storage)).toEqual(defaultColumnLayout())

    storage.setItem(COLUMN_PREFERENCES_KEY, JSON.stringify({ version: 2 }))
    expect(loadColumnLayout(storage)).toEqual(defaultColumnLayout())
  })

  it('adds newly missing built-in columns back to an older layout', () => {
    const storage = new MemoryStorage()
    const oldLayout = defaultColumnLayout()
    oldLayout.columns = oldLayout.columns.filter((column) => column.id !== 'total')
    saveColumnLayout(storage, oldLayout)

    expect(loadColumnLayout(storage).columns.some((column) => column.id === 'total')).toBe(true)
  })

  it('clears persisted preferences when reset', () => {
    const storage = new MemoryStorage()
    saveColumnLayout(storage, {
      ...defaultColumnLayout(),
      columns: [createCustomColumn('customer', 'Customer')],
    })

    expect(resetColumnLayout(storage)).toEqual(defaultColumnLayout())
    expect(storage.getItem(COLUMN_PREFERENCES_KEY)).toBeNull()
  })
})

import writeXlsxFile from 'write-excel-file/browser'
import type { TrackerRow } from '../domain/types'
import type { ColumnDefinition } from '../table/columns'
import { excelSheet } from './excel'

export async function downloadExcel(rows: TrackerRow[], columnDefinitions?: ColumnDefinition[]): Promise<void> {
  const { data, columns, fileName } = excelSheet(rows, columnDefinitions)
  await writeXlsxFile(data, { columns }).toFile(fileName)
}

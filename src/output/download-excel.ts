import writeXlsxFile from 'write-excel-file/browser'
import type { TrackerRow } from '../domain/types'
import { excelSheet } from './excel'

export async function downloadExcel(rows: TrackerRow[]): Promise<void> {
  const { data, columns, fileName } = excelSheet(rows)
  await writeXlsxFile(data, { columns }).toFile(fileName)
}

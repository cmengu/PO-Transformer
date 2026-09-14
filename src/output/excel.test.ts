import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import type { TrackerRow } from '../domain/types'
import { excelFile } from './excel'
import { createCustomColumn, defaultColumns } from '../table/columns'

const onePoRow: TrackerRow = {
  job: '',
  drawing: '',
  pur: '',
  poDate: '03/09/2026',
  poNumber: '4500011111',
  line: 10,
  project: 'B9001-AA100',
  rev: '02',
  description: 'MOUNTING BRACKET',
  qty: 4,
  unitPrice: 12.5,
  total: 50,
  requested: '20/12/2026',
  flags: [],
}

async function unzipXlsx(blob: Blob) {
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
  const text = (path: string) => {
    const file = files[path]
    return file ? strFromU8(file) : ''
  }
  return {
    styles: text('xl/styles.xml'),
    sheet: text('xl/worksheets/sheet1.xml'),
    strings: text('xl/sharedStrings.xml'),
  }
}

describe('excelFile', () => {
  it('names the file after the PO when every row shares one PO number', async () => {
    const { fileName } = await excelFile([
      onePoRow,
      { ...onePoRow, line: 20, qty: 2, total: 25 },
    ])

    expect(fileName).toBe('PO-4500011111.xlsx')
  })

  it('names the file PO-rows-<dd-mm-yyyy> when rows come from more than one PO', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 14))
    try {
      const { fileName } = await excelFile([
        onePoRow,
        { ...onePoRow, poNumber: '4500022222', poDate: '14/09/2026' },
      ])
      expect(fileName).toBe('PO-rows-14-09-2026.xlsx')
    } finally {
      vi.useRealTimers()
    }
  })

  it('writes tracker header fills into the xlsx styles', async () => {
    const { blob } = await excelFile([onePoRow])
    const { styles } = await unzipXlsx(blob)

    expect(styles).toContain('FFD966')
    expect(styles).toContain('7FF5EA')
    expect(styles).toContain('D9D9D9')
    expect(styles).toContain('C00000')
  })

  it('stores Rev 02 as a string', async () => {
    const { blob } = await excelFile([onePoRow])
    const { sheet, strings } = await unzipXlsx(blob)

    expect(strings).toMatch(/<t[^>]*>02<\/t>/)
    expect(sheet).toMatch(/<c r="H2"[^>]*t="s"/)
  })

  it('stores Qty as a number', async () => {
    const { blob } = await excelFile([onePoRow])
    const { sheet } = await unzipXlsx(blob)
    const qty = sheet.match(/<c r="J2"[^>]*>([\s\S]*?)<\/c>/)?.[1]

    expect(qty).toContain('<v>4</v>')
    expect(sheet).not.toMatch(/<c r="J2"[^>]*t="s"/)
  })

  it('stores dates as Excel serials formatted dd/mm/yyyy', async () => {
    const { blob } = await excelFile([onePoRow])
    const { sheet, styles } = await unzipXlsx(blob)
    const poDate = sheet.match(/<c r="C2"[^>]*>([\s\S]*?)<\/c>/)?.[1]
    const requested = sheet.match(/<c r="K2"[^>]*>([\s\S]*?)<\/c>/)?.[1]

    expect(styles).toContain('dd/mm/yyyy')
    expect(poDate).toContain('<v>46268</v>')
    expect(requested).toContain('<v>46376</v>')
    expect(sheet).not.toMatch(/<c r="C2"[^>]*t="s"/)
    expect(sheet).not.toMatch(/<c r="K2"[^>]*t="s"/)
  })

  it('stores an unpadded edited date 5/1/2026 as a real Excel date', async () => {
    const { blob } = await excelFile([{ ...onePoRow, requested: '5/1/2026' }])
    const { sheet, styles } = await unzipXlsx(blob)
    const requested = sheet.match(/<c r="K2"[^>]*>([\s\S]*?)<\/c>/)?.[1]

    expect(styles).toContain('dd/mm/yyyy')
    expect(requested).toContain('<v>')
    expect(sheet).not.toMatch(/<c r="K2"[^>]*t="s"/)
  })

  it('keeps an unparseable edited date as text instead of dropping it', async () => {
    const { blob } = await excelFile([{ ...onePoRow, requested: 'ASAP' }])
    const { strings, sheet } = await unzipXlsx(blob)

    expect(strings).toMatch(/<t[^>]*>ASAP<\/t>/)
    expect(sheet).toMatch(/<c r="K2"[^>]*t="s"/)
  })

  it('fills flagged cells pink', async () => {
    const { blob } = await excelFile([
      {
        ...onePoRow,
        project: '',
        rev: '',
        requested: '',
        flags: ['project', 'rev', 'requested'],
      },
    ])
    const { styles } = await unzipXlsx(blob)

    expect(styles).toContain('FFC7CE')
  })

  it('keeps visually obscured prices blank and fills them pink', async () => {
    const { blob } = await excelFile([
      {
        ...onePoRow,
        unitPrice: null,
        total: null,
        obscured: ['unitPrice', 'total'],
      },
    ])
    const { sheet, styles, strings } = await unzipXlsx(blob)

    expect(styles).toContain('FFC7CE')
    expect(sheet).toMatch(/<c r="L2"[^>]*\/>/)
    expect(sheet).toMatch(/<c r="M2"[^>]*\/>/)
    expect(strings).not.toContain('12.5')
  })

  it('keeps an invalid PO date as text and fills it pink', async () => {
    const { blob } = await excelFile([{
      ...onePoRow,
      poDate: '31/02/2026',
      dateIssues: { poDate: { kind: 'invalid', raw: '31/02/2026' } },
    }])
    const { styles, strings } = await unzipXlsx(blob)
    expect(styles).toContain('FFC7CE')
    expect(strings).toContain('31/02/2026')
  })

  it('writes caller-defined columns in their supplied order', async () => {
    const custom = createCustomColumn('customer', 'Customer')
    const columns = [custom, defaultColumns()[3]]
    const { blob } = await excelFile([{ ...onePoRow, customValues: { customer: 'Acme Precision' } }], columns)
    const { strings, sheet } = await unzipXlsx(blob)
    expect(strings).toContain('Customer')
    expect(strings).toContain('Acme Precision')
    expect(sheet).toMatch(/<c r="A2"[^>]*t="s"/)
    expect(sheet).toMatch(/<c r="B2"[^>]*t="s"/)
  })
})

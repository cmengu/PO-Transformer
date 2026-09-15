import { describe, expect, it } from 'vitest'
import type { TrackerRow } from '../domain/types'
import { clipboardPayload } from './clipboard'
import { createCustomColumn, defaultColumns } from '../table/columns'

const twoPoRows: TrackerRow[] = [
  {
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
  },
  {
    job: '',
    drawing: '',
    pur: '',
    poDate: '14/09/2026',
    poNumber: '4500022222',
    line: 20,
    project: 'C8002-BB200',
    rev: '03',
    description: 'COVER PLATE',
    qty: 10,
    unitPrice: 3.25,
    total: 32.5,
    requested: '01/11/2026',
    flags: [],
  },
]

describe('clipboardPayload', () => {
  it('returns tab-separated plain text for a two-PO sample', () => {
    const { plain } = clipboardPayload(twoPoRows)

    expect(plain).toBe(
      [
        'Job#\tEngineering drawing#\tPO Date\tPO #\tLine\tPur\tProject Number\tRev\tDescription\tPO Qty\tRequested Date\tUnit Price\tTotal Price',
        '\t\t03/09/2026\t4500011111\t10\t\tB9001-AA100\t02\tMOUNTING BRACKET\t4\t20/12/2026\t12.5\t50',
        '\t\t14/09/2026\t4500022222\t20\t\tC8002-BB200\t03\tCOVER PLATE\t10\t01/11/2026\t3.25\t32.5',
      ].join('\n'),
    )
  })

  it('puts an inline border on every td', () => {
    const { html } = clipboardPayload(twoPoRows)

    const tds = [...html.matchAll(/<td\b[^>]*>/g)].map((match) => match[0])
    expect(tds.length).toBe(26)
    for (const td of tds) {
      expect(td).toContain('border:')
    }
  })

  it('uses tracker header colours', () => {
    const { html } = clipboardPayload(twoPoRows)
    const ths = [...html.matchAll(/<th\b[^>]*>[^<]*<\/th>/g)].map((match) => match[0])

    expect(ths).toHaveLength(13)
    expect(ths[0]).toContain('#FFD966')
    expect(ths[0]).toContain('#C00000')
    expect(ths[1]).toContain('#FFD966')
    expect(ths[1]).toContain('#C00000')
    expect(ths[2]).toContain('#FFD966')
    expect(ths[3]).toContain('#FFD966')
    expect(ths[5]).toContain('#C00000')
    expect(ths[6]).toContain('#C00000')
    expect(ths[7]).toContain('#C00000')
    expect(ths[9]).toContain('#7FF5EA')
    expect(ths[10]).toContain('#C00000')
    expect(ths[11]).toContain('#D9D9D9')
    expect(ths[12]).toContain('#D9D9D9')
  })

  it('marks Rev and date cells with mso-number-format text', () => {
    const { html } = clipboardPayload(twoPoRows)
    const tds = [...html.matchAll(/<td\b[^>]*>/g)].map((match) => match[0])

    expect(tds[2]).toContain("mso-number-format:'\\@'")
    expect(tds[7]).toContain("mso-number-format:'\\@'")
    expect(tds[10]).toContain("mso-number-format:'\\@'")
  })

  it('does not use border-collapse collapse', () => {
    const { html } = clipboardPayload(twoPoRows)
    expect(html).not.toContain('border-collapse: collapse')
    expect(html).not.toContain('border-collapse:collapse')
  })

  it('escapes HTML in cell values', () => {
    const { html, plain } = clipboardPayload([
      {
        ...twoPoRows[0],
        description: 'BRACKET & PLATE <A>',
      },
    ])

    expect(plain).toContain('BRACKET & PLATE <A>')
    expect(html).toContain('BRACKET &amp; PLATE &lt;A&gt;')
    expect(html).not.toContain('BRACKET & PLATE <A>')
  })

  it('fills flagged cells pink', () => {
    const { html } = clipboardPayload([
      {
        ...twoPoRows[0],
        project: '',
        rev: '',
        requested: '',
        flags: ['project', 'rev', 'requested'],
      },
    ])
    const tds = [...html.matchAll(/<td\b[^>]*>/g)].map((match) => match[0])

    expect(tds[6]).toContain('#FFC7CE')
    expect(tds[7]).toContain('#FFC7CE')
    expect(tds[10]).toContain('#FFC7CE')
    expect(tds[3]).not.toContain('#FFC7CE')
  })

  it('keeps visually obscured prices blank and marks their cells pink', () => {
    const { html, plain } = clipboardPayload([
      {
        ...twoPoRows[0],
        unitPrice: null,
        total: null,
        obscured: ['unitPrice', 'total'],
      },
    ])
    const tds = [...html.matchAll(/<td\b[^>]*>/g)].map((match) => match[0])

    expect(plain).toContain('\t20/12/2026\t\t')
    expect(tds[11]).toContain('#FFC7CE')
    expect(tds[12]).toContain('#FFC7CE')
  })

  it('keeps an invalid PO date visible and marks it pink', () => {
    const { html, plain } = clipboardPayload([{
      ...twoPoRows[0],
      poDate: '31/02/2026',
      dateIssues: { poDate: { kind: 'invalid', raw: '31/02/2026' } },
    }])
    const tds = [...html.matchAll(/<td\b[^>]*>/g)].map((match) => match[0])
    expect(plain).toContain('31/02/2026')
    expect(tds[2]).toContain('#FFC7CE')
  })

  it('exports caller-defined columns in their supplied order', () => {
    const custom = createCustomColumn('customer', 'Customer')
    const columns = [custom, defaultColumns()[3]]
    const { plain } = clipboardPayload([{ ...twoPoRows[0], customValues: { customer: 'Acme Precision' } }], columns)
    expect(plain).toBe(['Customer\tPO #', 'Acme Precision\t4500011111'].join('\n'))
  })

  it('can omit headings from both clipboard formats', () => {
    const columns = [defaultColumns()[3], defaultColumns()[6]]
    const { html, plain } = clipboardPayload(twoPoRows, columns, { includeHeaders: false })

    expect(plain).toBe(['4500011111\tB9001-AA100', '4500022222\tC8002-BB200'].join('\n'))
    expect(html).not.toContain('<th')
    expect(html).not.toContain('PO #')
  })

  it('puts padding, background and font on every th and td', () => {
    const { html } = clipboardPayload(twoPoRows)
    const cells = [...html.matchAll(/<(?:th|td)\b[^>]*>/g)].map((match) => match[0])

    expect(cells).toHaveLength(39)
    for (const cell of cells) {
      expect(cell).toContain('border:')
      expect(cell).toContain('background-color:')
      expect(cell).toContain('padding:')
      expect(cell).toContain('font-family:')
      expect(cell).toContain('font-size:')
      expect(cell).toContain('line-height:')
      expect(cell).not.toContain('class=')
      expect(cell).not.toContain('rowspan')
    }
    expect(html).not.toContain('<style')
  })
})

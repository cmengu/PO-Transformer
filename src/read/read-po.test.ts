import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readPo } from './read-po'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures')

function fixtureBytes(file: string): Uint8Array {
  return new Uint8Array(readFileSync(join(fixturesDir, file)))
}

function fixtureManifest(file: string) {
  const manifest = file.replace(/\.[^.]+$/, '.json')
  return JSON.parse(readFileSync(join(fixturesDir, manifest), 'utf8'))
}

describe('readPo', () => {
  it('reads f2-one-line.pdf into the expected tracker row', async () => {
    const file = 'f2-one-line.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('reads f1-two-lines.pdf into two tracker rows with blank prices unflagged', async () => {
    const file = 'f1-two-lines.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('reports f9-rejected.txt as not-pdf', async () => {
    const file = 'f9-rejected.txt'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('reports f8-scanned.pdf as no-text', async () => {
    const file = 'f8-scanned.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('reports f7-not-aem.pdf as not-aem', async () => {
    const file = 'f7-not-aem.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('keeps visible prices from f2-one-line.pdf', async () => {
    const file = 'f2-one-line.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
    if (result.kind === 'rows') {
      expect(result.rows[0]).toMatchObject({ unitPrice: 140, total: 1120 })
      expect(result.rows[0].obscured).toBeUndefined()
    }
  })

  it('does not import text-layer prices hidden by a later image overlay', async () => {
    const file = 'f12-obscured-prices.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
    if (result.kind === 'rows') {
      expect(result.rows[0]).toMatchObject({
        unitPrice: null,
        total: null,
        obscured: ['unitPrice', 'total'],
      })
    }
  })

  it('does not import text-layer prices hidden by a later vector fill', async () => {
    const file = 'f13-vector-obscured-prices.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
    if (result.kind === 'rows') {
      expect(result.rows[0]).toMatchObject({
        unitPrice: null,
        total: null,
        obscured: ['unitPrice', 'total'],
      })
    }
  })

  it('rejects a document header without any valid line items', async () => {
    const file = 'f10-header-only.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('rejects a PR-like line when the PO identity is missing', async () => {
    const file = 'f11-pr-only.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('flags a missing Date Required on f4-no-date-required.pdf', async () => {
    const file = 'f4-no-date-required.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
    if (result.kind === 'rows') {
      expect(result.rows[1].dateIssues).toEqual({ requested: { kind: 'missing' } })
    }
  })

  it('flags a missing rev on f5-no-rev-blank-prices.pdf without flagging blank prices', async () => {
    const file = 'f5-no-rev-blank-prices.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('reads f3-multi-page.pdf including the line that straddles the page break', async () => {
    const file = 'f3-multi-page.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })

  it('normalises awkward qty, prices, dates and description on f6-awkward-values.pdf', async () => {
    const file = 'f6-awkward-values.pdf'
    const result = await readPo(file, fixtureBytes(file))
    expect(result).toEqual(fixtureManifest(file))
  })
})

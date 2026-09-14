/**
 * Read any local PDF with the AEM PO reader and print tracker rows.
 * Does not copy or cache the file. Bytes are read, parsed, and discarded.
 *
 *   npm run check-po -- /absolute/path.pdf
 *   npm run check-po -- fixtures/f1-two-lines.pdf
 */
import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { readPo } from '../src/read/read-po'

const input = process.argv[2]
if (!input) {
  console.error('Usage: npm run check-po -- <path-to-pdf>')
  process.exit(1)
}

const abs = resolve(input)
let bytes: Uint8Array
try {
  bytes = new Uint8Array(readFileSync(abs))
} catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`Could not read ${abs}: ${message}`)
  process.exit(1)
}

const result = await readPo(basename(abs), bytes)

if (result.kind === 'issue') {
  console.error(`${result.file}: ${result.issue}`)
  process.exit(1)
}

console.table(
  result.rows.map((row) => ({
    'Job#': row.job,
    'Engineering drawing#': row.drawing,
    'PO Date': row.poDate,
    'PO #': row.poNumber,
    Line: row.line,
    Pur: row.pur,
    'Project Number': row.project,
    Rev: row.rev,
    Description: row.description,
    'PO Qty': row.qty,
    'Requested Date': row.requested,
    'Unit Price': row.unitPrice,
    'Total Price': row.total,
    flags: row.flags.length ? row.flags.join(', ') : '',
  })),
)

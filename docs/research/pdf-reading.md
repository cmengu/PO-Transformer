# Reading AEM PO text inside the browser

Research note for the ticket *Reading AEM PO text inside the browser* (map: *PO Transformer: AEM purchase orders to tracker rows*). Written 14 Sep 2026.

## Recommendation

Use **unpdf** (1.8.1 on npm, published Aug 2026) and call `extractTextItems` from a client-only component.

- It ships a serverless build of PDF.js (v5.6.205 per its README) with the **worker inlined**. That removes the most common Next.js break, where `pdf.worker.min.mjs` cannot be resolved or `workerSrc` is overwritten because it was set in a different module.
- `extractTextItems` returns, per page, every text run with `str`, `x`, `y`, `width`, `height`, `fontSize` and `hasEOL`. That is all the parser needs.
- The PDF never leaves the browser: read the dropped `File` with `arrayBuffer()` and pass it to `getDocumentProxy`.

**Fallback:** use `pdfjs-dist` (6.3.289, Aug 2026) directly with `getTextContent()`. The data is the same (`transform[4]` = x, `transform[5]` = y), but the setup costs more. Set `GlobalWorkerOptions.workerSrc` in the same file that loads the PDF, and disable SSR for that component.

Next.js wiring: the upload component is `'use client'`, and unpdf is loaded via dynamic `import('unpdf')` inside the drop handler so it never runs on the server.

**Browser floor to check:** PDF.js v5+ uses `Promise.withResolvers`, which Safari only has from 17.4. Chrome and Edge are fine. Test Safari on the deployed link before demo day.

## Anchoring approach (verified by spike)

The spike in [`spike/`](spike/) builds a two-page AEM-style PO with **invented values** (`make_po.mjs`) and parses it (`extract.mjs`).

1. **Rebuild lines.** For each page, group text items whose `y` differ by under 2 pt, then sort each line left to right by `x`.
2. **Header fields.** The value is the next item to the right of its label on the same line. `Document Number` → PO#; `Document Date` → PO Date.
3. **Find line items.** A line item starts on a line whose first item is a 10-digit PR number (`/^\d{10}$/`), and the next item is the Line number. This skips the footer, the delivery instructions and "Page 1 of 2".
4. **Fields inside the item block** (the next ~5 lines):
   - `EIN#:` → Project Number
   - the 2-digit run on the `MPN/Dwg No:` line → Rev
   - `Part Name:` → Description
   - `Date Required:` → Requested Date
5. **Numeric columns by position.** Quantity, Unit Price and Amount are matched by x-range against **that page's own column header row** (`Quantity`, `UOM`, `Unit Price`, `Discount`, `Amount`), so a slightly shifted page still maps.
6. **Normalise.**
   - `DD-MMM-YYYY` → `dd/mm/yyyy`.
   - Strip thousands commas.
   - `100.000` → 100.
   - Sort rows by Line.
   - Leave Job#, drawing# and Pur blank.
   - Any other empty field goes into a `missing` list, which becomes a red cell plus a note.

Spike output (invented PO 4500099001, 3 items, item 30 on page 2 with no Date Required):

| Line | PO Date | Project Number | Rev | Description | Qty | Requested | Unit | Total | missing |
|---|---|---|---|---|---|---|---|---|---|
| 10 | 03/09/2026 | B9001-XX100 | 03 | BRACKET PLATE | 50 | 20/12/2026 | 12.5 | 625 | — |
| 20 | 03/09/2026 | B9002-YY200 | 01 | CABLE CLIP SP2 | 1200 | 05/01/2027 | 0.85 | 1020 | — |
| 30 | 03/09/2026 | B9003-ZZ300 | 11 | SENSOR MOUNT | 8 | *(blank)* | 140 | 1120 | requested |

## Known traps

1. **Our replica is not AEM's real file.** pdf.js splits text differently from PDF to PDF. In [pdf.js #18201](https://github.com/mozilla/pdf.js/issues/18201), one PDF came out character by character and another as whole phrases. The real AEM PDF may put `EIN#:` and its value in separate runs, or merge a label with its value. The parser should therefore also match on each rebuilt line's joined text, not only on single runs. One run against a **genuine** AEM PDF, done locally and never committed, is the only real proof. That is already fog on the map.
2. **An item block can straddle a page break**, with the item starting at the bottom of page 1 and `Date Required` landing on page 2. The spike did not test this. Walk the pages' lines as one sequence for block fields, and keep the column anchors per page.
3. **Rev detection.** "Any 2-digit run on the MPN line" is loose. Prefer the run to the right of the MPN value's `x + width`.
4. **Scanned or image-only PDFs** return zero text items. Show a clear "this file can't be read (looks scanned)" message, not an empty table.
5. **Non-AEM PDFs.** If there is no `Document Number` label and no 10-digit PR lines, mark the whole file "not an AEM PO" rather than producing blank rows.
6. **Unpriced POs.** The sample's price boxes were blank. Treat missing Unit Price and Amount as flagged but not blocking.

## Sources

- unpdf README: https://github.com/unjs/unpdf/blob/main/README.md
- pdfjs-dist on npm: https://www.npmjs.com/package/pdfjs-dist
- Next.js worker-path failure: https://github.com/wojtekmaj/react-pdf/issues/1855
- pdf.js text run positions: https://github.com/mozilla/pdf.js/issues/8096
- Inconsistent text splitting: https://github.com/mozilla/pdf.js/issues/18201
- Safari floor (`Promise.withResolvers`): https://github.com/wojtekmaj/react-pdf/issues/1901

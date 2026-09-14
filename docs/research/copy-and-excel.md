# Copying a table that pastes cleanly into Outlook and Excel

Research note for the ticket *Copying a table that pastes cleanly into Outlook and Excel* (map: *PO Transformer: AEM purchase orders to tracker rows*). Written 14 Sep 2026.

## Recommendation: the Copy table button

Write **both** clipboard flavours in one click:

```js
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': new Blob([tableHtml], { type: 'text/html' }),
    'text/plain': new Blob([tsv], { type: 'text/plain' }),
  }),
]);
```

- **`text/plain` is not optional.** Without it, rich HTML copies can fail silently (see Sources). It also serves as the tab-separated fallback: headers plus one row per line, joined with `\t` and `\n`.
- `ClipboardItem` has been Baseline across modern browsers since June 2024 (MDN).
- It needs **HTTPS**, which Vercel gives us, and it must run inside the **click handler**, not after an await chain that loses the user gesture.
- If `write` throws, show a toast saying "Copy failed — use Download Excel". Don't fail silently.

### HTML that survives classic Outlook

Classic Outlook for Windows renders email with Word's engine, so the table must be old-school:

- **Inline styles only.** `<style>` blocks and classes don't come along on copy.
- **Borders:** `border` and `background-color` go on **each `<td>`/`<th>`**, not on `<table>`. Never use `border-collapse: collapse`, which produces ghost or missing lines.
- **Spacing:** padding goes on the `<td>`. Give every cell a font family, size and line-height.
- **Structure:** no `rowspan`, flex or grid. Set width as both an attribute and a style.
- **Dark mode:** Outlook's dark mode can invert the header colours. That's acceptable for a demo, but check it once.

New Outlook and Outlook on the web behave like a browser, so a table that works in classic Outlook works there too.

### Keeping values intact when the copy is pasted into Excel

Excel reads the **HTML** flavour and auto-converts values:

- `03/09/2026` can flip day and month on a US-locale machine.
- Rev `03` becomes `3`.
- Long PO numbers can turn into numbers.

To stop this, add `mso-number-format:'\@'` (force text) to the inline style of the PO#, Rev, Project Number and both date cells. Outlook ignores that property, which should be harmless there. Confirm it in the Outlook check on the deploy ticket.

## Recommendation: the Download Excel button

Use **write-excel-file** (4.1.1, published June 2026):

- `import writeXlsxFile from 'write-excel-file/browser'`, then `.toFile('PO-rows.xlsx')` triggers the browser download.
- It supports `backgroundColor`, `textColor`, `fontWeight`, borders, column `width` and `format`. That's enough to copy the tracker's yellow, red, cyan and grey header.
- Verified by spike ([`spike/xlsx.mjs`](spike/xlsx.mjs)). I unzipped the output and checked:
  - `styles.xml` carries the tracker fills (yellow `FFD966`, cyan `7FF5EA`, grey `D9D9D9`), the pink flag fill (`FFC7CE`), and red and black header fonts.
  - `sheet1.xml` keeps Rev `03` and PO# `4500099001` as text, Qty and prices as numbers, and column widths of 16.
- **API gotcha:** in 4.x the call is `writeXlsxFile(data, { columns }).toFile(name)`. An old-style `{ filePath }` option is **silently ignored**: the spike's first run logged success and wrote nothing.

Rejected options:

| Library | Why not |
|---|---|
| SheetJS `xlsx` from npm | npm is frozen at 0.18.5, which has CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS). Fixed builds are only on cdn.sheetjs.com, and the free edition can't style cells. |
| xlsx-js-style | Styling fork of SheetJS, last published May 2022. |
| ExcelJS 4.4.0 | Capable, but last published Dec 2024. `npm audit` flags its `uuid@8` dependency (moderate), and it is ~928 KB minified for a feature we use a sliver of. |

Types inside the file: PO#, Rev and Project Number are **strings**. Qty, Unit Price and Total are **numbers**. Dates are **still to be decided with the user**: real Excel dates formatted `dd/mm/yyyy` sort properly, while text matches paste-into-tracker behaviour.

## Still to check by hand (deploy ticket)

- Paste into classic Outlook (Windows) and Outlook on Mac or web, with dark mode on and off.
- Paste the same copy into Excel and confirm Rev `03` and the dates survive.
- Open the downloaded file in Excel and check the colours and column widths.
- Safari: the copy button and PDF reading, since PDF.js v5+ needs Safari 17.4.

## Sources

- MDN, ClipboardItem: https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem
- Why `clipboard.write` drops HTML without `text/plain`: https://www.nikouusitalo.com/blog/why-isnt-clipboard-write-copying-my-richtext-html/
- Outlook table survival rules: https://www.pasteclean.app/blog/fixing-table-formatting-issues-in-outlook-emails-2026
- `mso-number-format` for Excel: https://dev.to/anrodriguez/styling-excel-cells-with-mso-number-format-css-attribute-updated-j6i
- write-excel-file: https://github.com/catamphetamine/write-excel-file
- SheetJS npm advisories: https://cdn.sheetjs.com/advisories/CVE-2023-30533 and https://cdn.sheetjs.com/advisories/CVE-2024-22363
- xlsx-js-style: https://github.com/gitbrent/xlsx-js-style

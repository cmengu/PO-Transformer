// Spike: positional extraction with unpdf, then rows in tracker order.
import { readFileSync } from 'node:fs';
import { getDocumentProxy, extractTextItems } from 'unpdf';

const pdf = await getDocumentProxy(new Uint8Array(readFileSync('po.pdf')));
const { items } = await extractTextItems(pdf);
console.log('first raw item on page 1:', items[0]?.[0]);

// Group each page's items into visual lines by y (2pt tolerance), left to right.
const pages = items.map(pageItems => {
  const lines = [];
  for (const it of pageItems.filter(i => i.str.trim())) {
    const line = lines.find(l => Math.abs(l.y - it.y) < 2);
    line ? line.items.push(it) : lines.push({ y: it.y, items: [it] });
  }
  lines.sort((a, b) => b.y - a.y);
  lines.forEach(l => l.items.sort((a, b) => a.x - b.x));
  return lines;
});

const valueRightOf = (label) => {
  for (const lines of pages) for (const l of lines) {
    const i = l.items.findIndex(it => it.str.trim() === label);
    if (i >= 0) return l.items[i + 1]?.str.trim();
  }
};
const MONTHS = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
const ddmmyyyy = (s) => { const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(s ?? ''); return m ? `${m[1]}/${MONTHS[m[2]]}/${m[3]}` : null; };

const poNumber = valueRightOf('Document Number');
const poDate = ddmmyyyy(valueRightOf('Document Date'));

const rows = [];
for (const lines of pages) {
  // Column anchors come from this page's own header row, so shifted layouts still map.
  const head = lines.find(l => l.items.some(i => i.str === 'Quantity'));
  const col = (name) => head.items.find(i => i.str === name).x;
  const inCol = (l, name, next) => l.items.find(i => i.x >= col(name) - 5 && (!next || i.x < col(next) - 5))?.str.trim();
  lines.forEach((l, idx) => {
    const first = l.items[0]?.str.trim();
    if (!/^\d{10}$/.test(first)) return;              // a line item starts with its PR number
    const block = lines.slice(idx, idx + 5);
    const text = (prefix) => block.flatMap(b => b.items).find(i => i.str.startsWith(prefix))?.str.slice(prefix.length).trim();
    const mpnLine = block.find(b => b.items.some(i => i.str.startsWith('MPN/Dwg No:')));
    const rev = mpnLine?.items.find(i => /^\d{2}$/.test(i.str.trim()))?.str.trim();
    const num = (s) => (s ? Number(s.replace(/,/g, '')) : null);
    const row = {
      job: '', drawing: '', poDate, poNumber, line: Number(l.items[1].str),
      pur: '', project: text('EIN#:'), rev, description: text('Part Name:'),
      qty: num(inCol(l, 'Quantity', 'UOM')), requested: ddmmyyyy(text('Date Required:')),
      unitPrice: num(inCol(l, 'Unit Price', 'Discount')), total: num(inCol(l, 'Amount')),
    };
    row.missing = Object.entries(row).filter(([k, v]) => !['job', 'drawing', 'pur'].includes(k) && (v === null || v === undefined || v === '')).map(([k]) => k);
    rows.push(row);
  });
}
rows.sort((a, b) => a.line - b.line);
console.table(rows);

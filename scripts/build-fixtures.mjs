/**
 * Dev-only builder: invented AEM-style PO PDFs + expected-result manifests.
 * Re-running this file must reproduce the same bytes (fixed dates, trailer IDs).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';
import { PDFDocument, StandardFonts, rgb, PDFHexString } from 'pdf-lib';
import { FIXTURES, expectedResult } from './fixture-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'fixtures');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const BLACK = rgb(0, 0, 0);
const LINE_GAP = 11;
const ITEM_GAP = 8;
const FOOTER_TOP = 96;
const FIRST_ITEM_Y = 548;

const COL = {
  pr: 40,
  itemNo: 98,
  desc: 140,
  qty: 318,
  uom: 372,
  unitPrice: 408,
  discount: 472,
  amount: 528,
};

const FIXED_DATE = new Date(Date.UTC(2026, 8, 3, 0, 0, 0));

function formatQty(n) {
  const [i, d] = n.toFixed(3).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`;
}

function formatMoney(n) {
  if (n == null) return '';
  const sign = n < 0 ? '-' : '';
  const [i, d] = Math.abs(n).toFixed(2).split('.');
  return `${sign}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`;
}

function strokeRect(page, x, y, w, h, borderWidth = 0.6) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: BLACK,
    borderWidth,
  });
}

function hline(page, x1, x2, y, thickness = 0.4) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color: BLACK });
}

function vline(page, x, y1, y2, thickness = 0.4) {
  page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness, color: BLACK });
}

function itemLines(item) {
  const lines = [
    { kind: 'pr' },
    { kind: 'mpn' },
    { kind: 'part' },
  ];
  if (item.dateRequired) lines.push({ kind: 'date' });
  lines.push({ kind: 'qr' });
  return lines;
}

function planPages(fixture) {
  if (fixture.kind !== 'aem') return [];
  const { items, straddleIndex } = fixture;
  if (straddleIndex == null) {
    return [items.map((item) => ({ item, from: 0, to: itemLines(item).length }))];
  }
  const page1 = [];
  const page2 = [];
  items.forEach((item, idx) => {
    const n = itemLines(item).length;
    if (idx < straddleIndex) page1.push({ item, from: 0, to: n });
    else if (idx === straddleIndex) {
      // PR + MPN + Part Name stay on page 1; Date Required + QR start page 2.
      page1.push({ item, from: 0, to: 3 });
      page2.push({ item, from: 3, to: n });
    } else page2.push({ item, from: 0, to: n });
  });
  return [page1, page2];
}

async function createDoc(title, seed) {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(title);
  doc.setProducer('PO Transformer fixture builder');
  doc.setCreator('PO Transformer fixture builder');
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const hex = Buffer.from(seed.padEnd(16, '0').slice(0, 16), 'utf8').toString('hex').toUpperCase();
  const id = PDFHexString.of(hex);
  doc.context.trailerInfo.ID = [id, id];
  return doc;
}

async function savePdf(doc) {
  return doc.save({ useObjectStreams: false });
}

function drawText(page, text, x, y, font, size = 8) {
  if (!text) return;
  page.drawText(text, { x, y, size, font, color: BLACK });
}

function drawChrome(page, fonts, header, pageNo, pageCount) {
  const { regular: font, bold } = fonts;
  const left = MARGIN;
  const right = PAGE_W - MARGIN;
  const innerW = right - left;
  const leftW = 258;
  const gap = 6;
  const rightX = left + leftW + gap;
  const rightW = right - rightX;

  const title = 'Purchase Order';
  const titleSize = 20;
  drawText(page, title, right - font.widthOfTextAtSize(title, titleSize), PAGE_H - 52, font, titleSize);

  const boxTop = PAGE_H - 70;
  const billingH = 48;
  const stackGap = 3;
  const vendorH = 100;
  const infoH = billingH + stackGap + vendorH;
  const billingBottom = boxTop - billingH;
  const vendorTop = billingBottom - stackGap;
  const vendorBottom = vendorTop - vendorH;
  const infoBottom = boxTop - infoH;

  strokeRect(page, left, billingBottom, leftW, billingH);
  drawText(page, 'Billing Address:', left + 5, boxTop - 12, bold, 8);

  strokeRect(page, left, vendorBottom, leftW, vendorH);
  let vy = vendorTop - 12;
  drawText(page, 'Vendor', left + 5, vy, bold, 8);
  vy -= 12;
  drawText(page, header.vendor.company, left + 5, vy, font, 8);
  for (const line of header.vendor.address) {
    vy -= 11;
    drawText(page, line, left + 5, vy, font, 8);
  }
  vy -= 13;
  drawText(page, `Attention: ${header.vendor.attention}`, left + 5, vy, font, 8);
  vy -= 12;
  drawText(page, `Tel: ${header.vendor.tel}`, left + 5, vy, font, 8);
  drawText(page, `Fax: ${header.vendor.fax}`, left + 130, vy, font, 8);

  strokeRect(page, rightX, infoBottom, rightW, infoH);
  const infoRows = [
    ['Information', ''],
    ['Document Number', header.documentNumber],
    ['Document Date', header.documentDate],
    ['Vendor No.', header.vendorNo],
    ['Currency', header.currency],
    ['Buyer', header.buyer],
    ['Terms of Payment:', header.terms],
    ['Downpayment Amount:', header.downpaymentAmount],
    ['Downpayment Date:', header.downpaymentDate],
    ['Incoterms:', header.incoterms],
  ];
  const rowH = infoH / infoRows.length;
  const splitX = rightX + rightW * 0.48;
  // Header row spans the box; the label/value split starts from Document Number.
  vline(page, splitX, infoBottom, boxTop - rowH);
  infoRows.forEach(([label, value], i) => {
    const yTop = boxTop - i * rowH;
    const yBot = yTop - rowH;
    if (i > 0) hline(page, rightX, rightX + rightW, yTop);
    const textY = yBot + 4;
    drawText(page, label, rightX + 4, textY, bold, 8);
    if (i > 0) drawText(page, value, splitX + 4, textY, font, 8);
  });

  const shipH = 28;
  const shipBottom = infoBottom - 6 - shipH;
  strokeRect(page, left, shipBottom, innerW, shipH);
  drawText(page, 'Shipping Address:', left + 5, shipBottom + shipH - 11, bold, 8);
  drawText(page, 'Special Instructions:', left + 5, shipBottom + 6, bold, 8);

  const headY = shipBottom - 18;
  drawText(page, 'PR/No', COL.pr, headY, bold, 8);
  drawText(page, 'Item No', COL.itemNo, headY, bold, 8);
  drawText(page, 'Quantity', COL.qty, headY, bold, 8);
  drawText(page, 'UOM', COL.uom, headY, bold, 8);
  drawText(page, 'Unit Price', COL.unitPrice, headY, bold, 8);
  drawText(page, 'Discount', COL.discount, headY, bold, 8);
  drawText(page, 'Amount', COL.amount, headY, bold, 8);
  hline(page, left, right, headY - 4, 0.6);

  const footer = [
    'SUPPLIERS ARE REMINDED OF THE FOLLOWING DELIVERY INSTRUCTIONS:',
    '- RECEIVING TIME: WEEKDAYS 8:15AM-11:15AM AND 1:00PM-4:45PM.',
    '- ACKNOWLEDGE THIS ORDER BY EMAIL. SUPPLY GOODS BY THE DATE REQUIRED ON THE PO.',
    '- SHOW THE PO NUMBER, EIN, MPN/DWG NO, PART NAME AND PROJECT NUMBER ON ALL DELIVERY DOCUMENTS.',
  ];
  footer.forEach((line, i) => {
    drawText(page, line, left, 78 - i * 8, font, 6);
  });
  const gen = 'THIS IS A COMPUTER GENERATED DOCUMENT. NO SIGNATURE IS REQUIRED.';
  drawText(page, gen, left, 36, bold, 8);
  const pageLabel = `Page ${pageNo} of ${pageCount}`;
  drawText(page, pageLabel, right - bold.widthOfTextAtSize(pageLabel, 8), 36, bold, 8);
}

function drawEmptyBox(page, x, y, w = 46, h = 11) {
  strokeRect(page, x, y - 2, w, h, 0.4);
}

function drawItemSlice(page, fonts, header, item, y, from, to) {
  const { regular: font } = fonts;
  const lines = itemLines(item);
  let cursor = y;
  for (let i = from; i < to && i < lines.length; i++) {
    const kind = lines[i].kind;
    if (kind === 'pr') {
      drawText(page, item.pr, COL.pr, cursor, font);
      drawText(page, String(item.line), COL.itemNo, cursor, font);
      drawText(page, `EIN#: ${item.project}`, COL.desc, cursor, font);
      drawText(page, formatQty(item.qty), COL.qty, cursor, font);
      drawText(page, 'PC', COL.uom, cursor, font);
      if (item.unitPrice == null) {
        drawEmptyBox(page, COL.unitPrice, cursor);
        drawEmptyBox(page, COL.amount, cursor);
      } else {
        const amount = Number((item.qty * item.unitPrice).toFixed(2));
        drawText(page, formatMoney(item.unitPrice), COL.unitPrice, cursor, font);
        drawText(page, formatMoney(amount), COL.amount, cursor, font);
      }
    } else if (kind === 'mpn') {
      drawText(page, header.buyerFirst, COL.pr, cursor, font);
      const mpn = `MPN/Dwg No: ${item.project}`;
      drawText(page, mpn, COL.desc, cursor, font);
      if (item.rev) {
        const w = font.widthOfTextAtSize(mpn, 8);
        drawText(page, item.rev, COL.desc + w + 10, cursor, font);
      }
    } else if (kind === 'part') {
      drawText(page, `Part Name: ${item.partName}`, COL.desc, cursor, font);
    } else if (kind === 'date') {
      drawText(page, `Date Required: ${item.dateRequired}`, COL.desc, cursor, font);
    } else if (kind === 'qr') {
      drawText(page, 'QR-AEM Internal', COL.desc, cursor, font);
    }
    cursor -= LINE_GAP;
  }
  return cursor - ITEM_GAP;
}

function drawTotals(page, fonts, items) {
  const { regular: font, bold } = fonts;
  const labelX = 400;
  const valueX = 528;
  let y = FOOTER_TOP + 70;
  const priced = items.filter((it) => it.unitPrice != null);
  const extra = '0.00';
  const sub = priced.length
    ? Number(priced.reduce((s, it) => s + it.qty * it.unitPrice, 0).toFixed(2))
    : null;
  const rows = [
    ['Less Discount', ''],
    ['Add Additional Charges', extra],
    ['Sub-Total', sub == null ? '' : formatMoney(sub)],
    ['Add GST 0.00 %', ''],
    ['Total', sub == null ? '' : formatMoney(sub)],
  ];
  rows.forEach(([label, value], i) => {
    const f = i === rows.length - 1 ? bold : font;
    drawText(page, label, labelX, y, f, 8);
    drawText(page, value, valueX, y, f, 8);
    y -= 12;
  });
}

async function buildAem(fixture) {
  const pagesPlan = planPages(fixture);
  const doc = await createDoc(fixture.title, fixture.file);
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const priceOverlay = fixture.obscurePriceFields
    ? await doc.embedPng(grayPng(170, 16, 255))
    : null;
  const pageCount = pagesPlan.length;
  pagesPlan.forEach((slices, i) => {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    drawChrome(page, fonts, fixture.header, i + 1, pageCount);
    let y = FIRST_ITEM_Y;
    for (const slice of slices) {
      y = drawItemSlice(page, fonts, fixture.header, slice.item, y, slice.from, slice.to);
    }
    if (i === pageCount - 1) drawTotals(page, fonts, fixture.items);
    if (priceOverlay && i === 0) {
      page.drawImage(priceOverlay, {
        x: COL.unitPrice - 4,
        y: FIRST_ITEM_Y - 4,
        width: 170,
        height: 16,
      });
    }
    if (fixture.vectorObscurePriceFields && i === 0) {
      page.drawRectangle({
        x: COL.unitPrice - 4,
        y: FIRST_ITEM_Y - 4,
        width: 170,
        height: 16,
        color: rgb(1, 1, 1),
      });
    }
  });
  return savePdf(doc);
}

async function buildNotAem(fixture) {
  const doc = await createDoc(fixture.title, fixture.file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  if (fixture.variant === 'header-only') {
    drawText(page, 'Purchase Order', 72, PAGE_H - 80, bold, 16);
    drawText(page, 'Document Number', 72, PAGE_H - 120, bold, 10);
    drawText(page, '4500081010', 190, PAGE_H - 120, font, 10);
    drawText(page, 'Document Date', 72, PAGE_H - 140, bold, 10);
    drawText(page, '14-SEP-2026', 190, PAGE_H - 140, font, 10);
    drawText(page, 'Draft order summary - no line items included.', 72, PAGE_H - 185, font, 10);
    return savePdf(doc);
  }
  if (fixture.variant === 'pr-only') {
    drawText(page, 'Workshop material request', 72, PAGE_H - 80, bold, 16);
    drawText(page, 'PR/No', 72, PAGE_H - 120, bold, 10);
    drawText(page, 'Item No', 160, PAGE_H - 120, bold, 10);
    drawText(page, '6000081011', 72, PAGE_H - 145, font, 10);
    drawText(page, '10', 160, PAGE_H - 145, font, 10);
    drawText(page, 'Fixture base plate', 225, PAGE_H - 145, font, 10);
    return savePdf(doc);
  }
  const lines = [
    [bold, 16, 'Workshop notes'],
    [font, 10, '14 September 2026'],
    [font, 10, ''],
    [font, 10, 'Attendees: Glen, Priya, Omar'],
    [font, 10, ''],
    [font, 10, 'Agenda:'],
    [font, 10, '1. Shelf layout for Q4'],
    [font, 10, '2. Spare-parts count'],
    [font, 10, '3. Next packing run'],
    [font, 10, ''],
    [font, 10, 'No purchase-order content in this file.'],
  ];
  let y = PAGE_H - 80;
  for (const [f, size, text] of lines) {
    if (text) page.drawText(text, { x: 72, y, size, font: f, color: BLACK });
    y -= size + 8;
  }
  return savePdf(doc);
}

function grayPng(width, height, fill = 210) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width, fill);
    row[0] = 0;
    if (fill < 255 && y % 42 < 3) row.fill(186, 1);
    if (fill < 255 && y > 40 && y < 48) row.fill(160, 1);
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  const idat = deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const typeBuf = Buffer.from(type);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function buildScanned(fixture) {
  const doc = await createDoc(fixture.title, fixture.file);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const png = grayPng(400, 560, 208);
  const image = await doc.embedPng(png);
  page.drawImage(image, { x: 48, y: 70, width: 500, height: 700 });
  return savePdf(doc);
}

function manifestName(file) {
  return file.replace(/\.[^.]+$/, '.json');
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const fixture of FIXTURES) {
    const manifestPath = join(OUT, manifestName(fixture.file));
    writeFileSync(manifestPath, `${JSON.stringify(expectedResult(fixture), null, 2)}\n`);
    const dest = join(OUT, fixture.file);
    if (fixture.kind === 'aem') writeFileSync(dest, await buildAem(fixture));
    else if (fixture.kind === 'not-aem') writeFileSync(dest, await buildNotAem(fixture));
    else if (fixture.kind === 'scanned') writeFileSync(dest, await buildScanned(fixture));
    else if (fixture.kind === 'not-pdf') writeFileSync(dest, fixture.body);
    else throw new Error(`unknown kind ${fixture.kind}`);
    console.log('wrote', fixture.file);
  }
}

await main();

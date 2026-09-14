// Spike only: an AEM-style PO with INVENTED values, laid out like the photo.
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'node:fs';

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const W = 595, H = 842;

function header(page, n) {
  const t = (s, x, y, f = font, size = 8) => page.drawText(s, { x, y, size, font: f });
  t('Purchase Order', 400, H - 70, font, 18);
  t('Information', 300, H - 110, bold);
  const info = [
    ['Document Number', '4500099001'], ['Document Date', '03-SEP-2026'], ['Vendor No.', '2100999'],
    ['Currency', 'SGD'], ['Buyer', 'Test BUYER'], ['Terms of Payment:', 'Due within 90 days'],
  ];
  info.forEach(([k, v], i) => { t(k, 300, H - 124 - i * 12, bold); t(v, 420, H - 124 - i * 12); });
  t('PR/No', 45, H - 230, bold); t('Item No', 130, H - 230, bold); t('Quantity', 320, H - 230, bold);
  t('UOM', 370, H - 230, bold); t('Unit Price', 405, H - 230, bold); t('Discount', 465, H - 230, bold);
  t('Amount', 530, H - 230, bold);
  t(`Page ${n} of 2`, 520, 40, bold);
  return t;
}

function item(t, y, pr, line, ein, rev, name, date, qty, unit, amount) {
  t(pr, 45, y); t(String(line), 105, y); t(`EIN#: ${ein}`, 130, y);
  t(qty, 320, y); t('PC', 370, y); t(unit, 405, y); t(amount, 530, y);
  t('Buyer', 45, y - 12);
  t(`MPN/Dwg No: ${ein}`, 130, y - 12); t(rev, 240, y - 12);
  t(`Part Name: ${name}`, 130, y - 24);
  t(`Date Required: ${date}`, 130, y - 36);
  t('QR-AEM Internal', 130, y - 48);
}

const p1 = header(doc.addPage([W, H]), 1);
item(p1, H - 260, '6006500001', 10, 'B9001-XX100', '03', 'BRACKET PLATE', '20-DEC-2026', '50.000', '12.50', '625.00');
item(p1, H - 340, '6006500002', 20, 'B9002-YY200', '01', 'CABLE CLIP SP2', '05-JAN-2027', '1,200.000', '0.85', '1,020.00');
const p2 = header(doc.addPage([W, H]), 2);
item(p2, H - 260, '6006500003', 30, 'B9003-ZZ300', '11', 'SENSOR MOUNT', '', '8.000', '140.00', '1,120.00');

writeFileSync('po.pdf', await doc.save());
console.log('wrote po.pdf');

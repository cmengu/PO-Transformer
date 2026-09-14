/**
 * Invented fixture catalogue. Every PO number, vendor, buyer, part and
 * project here is made up. Do not paste values from a real client PO.
 */

const MONTHS = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

export function trackerDate(printed) {
  if (!printed) return '';
  const m = /^(\d{2})-([A-Z]{3})-(\d{4})$/.exec(printed);
  if (!m) throw new Error(`unrecognised printed date: ${printed}`);
  return `${m[1]}/${MONTHS[m[2]]}/${m[3]}`;
}

const VENDOR = {
  company: 'NORTH PEAK SUPPLIES PTE LTD',
  address: ['88 CEDAR LOOP #03-12 TECH PARK,', 'SINGAPORE 529900'],
  attention: 'Ken TAN',
  tel: '6123 4500',
  fax: '6123 4501',
};

function header(overrides) {
  return {
    vendorNo: '2100999',
    currency: 'SGD',
    buyer: 'Mira TAN',
    buyerFirst: 'Mira',
    terms: 'Due within 90 days',
    downpaymentAmount: '0.00',
    downpaymentDate: '',
    incoterms: 'EXW SINGAPORE',
    vendor: VENDOR,
    ...overrides,
  };
}

function moneyTotal(item) {
  if (item.unitPrice == null || item.qty == null) return null;
  return Number((item.qty * item.unitPrice).toFixed(2));
}

export function expectedRow(poHeader, item) {
  const flags = [];
  if (!item.project) flags.push('project');
  if (!item.rev) flags.push('rev');
  if (!item.dateRequired) flags.push('requested');
  const obscured = item.obscured ?? [];
  const row = {
    job: '',
    drawing: '',
    pur: '',
    poDate: trackerDate(poHeader.documentDate),
    poNumber: poHeader.documentNumber,
    line: item.line,
    project: item.project ?? '',
    rev: item.rev ?? '',
    description: item.partName ?? '',
    qty: item.qty ?? null,
    unitPrice: obscured.includes('unitPrice') ? null : item.unitPrice ?? null,
    total: obscured.includes('total') ? null : moneyTotal(item),
    requested: item.dateRequired ? trackerDate(item.dateRequired) : '',
    flags,
  };
  if (obscured.length > 0) row.obscured = obscured;
  if (!item.dateRequired) row.dateIssues = { requested: { kind: 'missing' } };
  return row;
}

export function expectedResult(fixture) {
  if (fixture.kind !== 'aem') {
    return { file: fixture.file, kind: 'issue', issue: fixture.issue };
  }
  const rows = fixture.items
    .map((item) => expectedRow(fixture.header, item))
    .sort((a, b) => a.line - b.line);
  return { file: fixture.file, kind: 'rows', rows };
}

/** Shared invented vendor / buyer; only the PO identity and lines vary. */
export const FIXTURES = [
  {
    id: 'f1',
    file: 'f1-two-lines.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F1',
    header: header({
      documentNumber: '4500099001',
      documentDate: '03-SEP-2026',
    }),
    items: [
      {
        pr: '6006500101',
        line: 10,
        project: 'B9001-XX100',
        rev: '03',
        partName: 'BRACKET PLATE',
        dateRequired: '20-SEP-2026',
        qty: 100,
        unitPrice: null,
      },
      {
        pr: '6006500102',
        line: 20,
        project: 'B9002-YY200',
        rev: '01',
        partName: 'HOUSING COVER',
        dateRequired: '28-SEP-2026',
        qty: 200,
        unitPrice: null,
      },
    ],
  },
  {
    id: 'f2',
    file: 'f2-one-line.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F2',
    header: header({
      documentNumber: '4500099002',
      documentDate: '04-SEP-2026',
    }),
    items: [
      {
        pr: '6006500201',
        line: 10,
        project: 'B9003-ZZ300',
        rev: '11',
        partName: 'SENSOR MOUNT',
        dateRequired: '15-OCT-2026',
        qty: 8,
        unitPrice: 140,
      },
    ],
  },
  {
    id: 'f3',
    file: 'f3-multi-page.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F3',
    // 0-based: item 60 starts on page 1, Date Required lands on page 2.
    straddleIndex: 5,
    header: header({
      documentNumber: '4500099003',
      documentDate: '05-SEP-2026',
    }),
    items: [
      item('6006500310', 10, 'B9013-AA110', '01', 'FLANGE RING', '01-OCT-2026', 12, 9.5),
      item('6006500320', 20, 'B9013-AA120', '02', 'SUPPORT ARM', '02-OCT-2026', 4, 55),
      item('6006500330', 30, 'B9013-AA130', '03', 'COVER PLATE', '03-OCT-2026', 25, 7.25),
      item('6006500340', 40, 'B9013-AA140', '04', 'HINGE PIN', '04-OCT-2026', 80, 1.1),
      item('6006500350', 50, 'B9013-AA150', '05', 'BASE PLATE', '05-OCT-2026', 6, 48),
      item('6006500360', 60, 'B9013-AA160', '06', 'STANDOFF POST', '18-OCT-2026', 30, 3.4),
      item('6006500370', 70, 'B9013-AA170', '07', 'END CAP', '07-OCT-2026', 15, 2.2),
      item('6006500380', 80, 'B9013-AA180', '08', 'SPRING CLIP', '08-OCT-2026', 200, 0.4),
    ],
  },
  {
    id: 'f4',
    file: 'f4-no-date-required.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F4',
    header: header({
      documentNumber: '4500099004',
      documentDate: '06-SEP-2026',
    }),
    items: [
      {
        pr: '6006500401',
        line: 10,
        project: 'B9004-RR400',
        rev: '02',
        partName: 'GUIDE RAIL',
        dateRequired: '12-OCT-2026',
        qty: 16,
        unitPrice: 22.5,
      },
      {
        pr: '6006500402',
        line: 20,
        project: 'B9004-RR410',
        rev: '02',
        partName: 'LOCK PIN',
        dateRequired: '',
        qty: 40,
        unitPrice: 3.75,
      },
    ],
  },
  {
    id: 'f5',
    file: 'f5-no-rev-blank-prices.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F5',
    header: header({
      documentNumber: '4500099005',
      documentDate: '07-SEP-2026',
    }),
    items: [
      {
        pr: '6006500501',
        line: 10,
        project: 'B9005-EE500',
        rev: '04',
        partName: 'CABLE CLIP',
        dateRequired: '22-OCT-2026',
        qty: 50,
        unitPrice: null,
      },
      {
        pr: '6006500502',
        line: 20,
        project: 'B9005-EE510',
        rev: '',
        partName: 'SPACER BLOCK',
        dateRequired: '22-OCT-2026',
        qty: 18,
        unitPrice: null,
      },
    ],
  },
  {
    id: 'f6',
    file: 'f6-awkward-values.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F6',
    header: header({
      documentNumber: '4500099006',
      documentDate: '08-SEP-2026',
    }),
    items: [
      {
        pr: '6006500601',
        line: 10,
        project: 'B9006-WW600',
        rev: '00',
        partName: 'ADAPTER 3/8-16 (TYPE-B)',
        dateRequired: '20-DEC-2026',
        qty: 1200,
        unitPrice: 0.85,
      },
      {
        pr: '6006500602',
        line: 20,
        project: 'B9006-WW610',
        rev: '07',
        partName: 'CLAMP-ARM #4',
        dateRequired: '05-JAN-2027',
        qty: 8,
        unitPrice: 140,
      },
    ],
  },
  {
    id: 'f7',
    file: 'f7-not-aem.pdf',
    kind: 'not-aem',
    issue: 'not-aem',
    title: 'Invented non-AEM document F7',
  },
  {
    id: 'f8',
    file: 'f8-scanned.pdf',
    kind: 'scanned',
    issue: 'no-text',
    title: 'Invented image-only PDF F8',
  },
  {
    id: 'f9',
    file: 'f9-rejected.txt',
    kind: 'not-pdf',
    issue: 'not-pdf',
    body: 'This file is plain text, not a PDF. It exists so a rejected drop can be tested.\n',
  },
  {
    id: 'f10',
    file: 'f10-header-only.pdf',
    kind: 'not-aem',
    issue: 'not-aem',
    title: 'Invented header-only document F10',
    variant: 'header-only',
  },
  {
    id: 'f11',
    file: 'f11-pr-only.pdf',
    kind: 'not-aem',
    issue: 'not-aem',
    title: 'Invented PR-only document F11',
    variant: 'pr-only',
  },
  {
    id: 'f12',
    file: 'f12-obscured-prices.pdf',
    kind: 'aem',
    title: 'Invented AEM-style purchase order F12',
    obscurePriceFields: true,
    header: header({
      documentNumber: '4500099012',
      documentDate: '12-SEP-2026',
    }),
    items: [
      {
        pr: '6006501201',
        line: 10,
        project: 'B9012-PP120',
        rev: '05',
        partName: 'PRECISION LOCATING PIN',
        dateRequired: '30-OCT-2026',
        qty: 100,
        unitPrice: 54,
        obscured: ['unitPrice', 'total'],
      },
    ],
  },
];

function item(pr, line, project, rev, partName, dateRequired, qty, unitPrice) {
  return { pr, line, project, rev, partName, dateRequired, qty, unitPrice };
}

export const AEM_ANCHORS = [
  'Purchase Order',
  'Document Number',
  'Document Date',
  'PR/No',
  'Item No',
  'Quantity',
  'UOM',
  'Unit Price',
  'Amount',
  'EIN#:',
  'MPN/Dwg No:',
  'Part Name:',
  'Date Required:',
  'QR-AEM Internal',
  'THIS IS A COMPUTER GENERATED DOCUMENT. NO SIGNATURE IS REQUIRED.',
];

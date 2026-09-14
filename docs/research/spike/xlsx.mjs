// Spike: styled tracker header with write-excel-file (node build; browser build shares the API).
import writeXlsxFile from 'write-excel-file/node';

const RED = '#C00000', YELLOW = '#FFD966', CYAN = '#7FF5EA', GREY = '#D9D9D9';
const cols = [
  ['Job#', RED, YELLOW], ['Engineering drawing#', RED, YELLOW], ['PO Date', '#000000', YELLOW], ['PO #', '#000000', YELLOW],
  ['Line', '#000000', YELLOW], ['Pur', RED, YELLOW], ['Project Number', RED, YELLOW], ['Rev', RED, YELLOW],
  ['Description', '#000000', YELLOW], ['PO Qty', '#000000', CYAN], ['Requested Date', RED, YELLOW],
  ['Unit Price', '#000000', GREY], ['Total Price', '#000000', GREY],
];
const header = cols.map(([value, textColor, backgroundColor]) => ({ value, textColor, backgroundColor, fontWeight: 'bold', align: 'center' }));
const row = ['', '', '03/09/2026', '4500099001', 10, '', 'B9001-XX100', '03', 'BRACKET PLATE', 50, '20/12/2026', 12.5, 625]
  .map(value => ({ value, type: typeof value === 'number' ? Number : String }));
row[10] = { value: '', backgroundColor: '#FFC7CE' }; // how a missing cell would be flagged

// v4 API: options no longer take filePath; the result exposes toFile/toBuffer (browser build: toFile triggers a download).
await writeXlsxFile([header, row], { columns: cols.map(() => ({ width: 16 })) }).toFile('tracker.xlsx');
console.log('wrote tracker.xlsx');

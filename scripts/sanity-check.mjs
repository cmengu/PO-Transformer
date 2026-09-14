/**
 * Sanity check: unpdf extractTextItems on each generated fixture.
 * F1–F7 must have a text layer; F8 must have none. F1–F6 must carry
 * the parser anchors from docs/research/pdf-reading.md.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocumentProxy, extractTextItems } from 'unpdf';
import { AEM_ANCHORS, FIXTURES } from './fixture-data.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pageText(pageItems) {
  return pageItems.map((it) => it.str).join(' ');
}

function allText(items) {
  return items.map(pageText).join('\n');
}

async function extractPdf(path) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  return extractTextItems(pdf);
}

const f3 = FIXTURES.find((f) => f.id === 'f3');
const straddle = f3.items[f3.straddleIndex];

for (const fixture of FIXTURES) {
  const path = join(OUT, fixture.file);
  if (fixture.kind === 'not-pdf') {
    const bytes = readFileSync(path);
    if (bytes.subarray(0, 4).toString() === '%PDF') {
      fail(`${fixture.file} must not be a PDF`);
    } else {
      console.log(`ok  ${fixture.file}  not a PDF`);
    }
    continue;
  }

  let items;
  try {
    ({ items } = await extractPdf(path));
  } catch (err) {
    fail(`${fixture.file} unpdf threw: ${err.message}`);
    continue;
  }

  const text = allText(items);
  const runCount = items.reduce((n, page) => n + page.filter((it) => it.str.trim()).length, 0);

  if (fixture.kind === 'scanned') {
    if (runCount !== 0) fail(`${fixture.file} expected 0 text runs, got ${runCount}`);
    else console.log(`ok  ${fixture.file}  no text (${items.length} page)`);
    continue;
  }

  if (runCount === 0) {
    fail(`${fixture.file} expected extractable text, got none`);
    continue;
  }

  if (fixture.kind === 'not-aem') {
    const hasDocumentNumber = text.includes('Document Number');
    const hasPrHeader = text.includes('PR/No');
    if (fixture.variant === 'header-only' && (!hasDocumentNumber || hasPrHeader)) {
      fail(`${fixture.file} must contain only the PO header anchor`);
    } else if (fixture.variant === 'pr-only' && (hasDocumentNumber || !hasPrHeader)) {
      fail(`${fixture.file} must contain only the PR anchor`);
    } else if (!fixture.variant && (hasDocumentNumber || hasPrHeader)) {
      fail(`${fixture.file} must not contain AEM parser anchors`);
    } else {
      console.log(`ok  ${fixture.file}  text, not AEM (${runCount} runs)`);
    }
    continue;
  }

  const missing = AEM_ANCHORS.filter((a) => !text.includes(a));
  if (missing.length) fail(`${fixture.file} missing anchors: ${missing.join(', ')}`);

  const hasPr = items.some((page) => page.some((it) => /^\d{10}$/.test(it.str.trim())));
  if (!hasPr) fail(`${fixture.file} has no 10-digit PR run`);

  if (fixture.id === 'f3') {
    const p1 = pageText(items[0] ?? []);
    const p2 = pageText(items[1] ?? []);
    if (items.length < 2) fail('f3 must span 2+ pages');
    if (!p1.includes(straddle.pr)) fail(`f3 page 1 missing straddling PR ${straddle.pr}`);
    if (p1.includes(`Date Required: ${straddle.dateRequired}`)) {
      fail('f3 straddling Date Required must not sit on page 1');
    }
    if (!p2.includes(`Date Required: ${straddle.dateRequired}`)) {
      fail(`f3 page 2 missing Date Required: ${straddle.dateRequired}`);
    }
  }

  if (process.exitCode) continue;
  console.log(`ok  ${fixture.file}  ${items.length}p ${runCount} runs`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('sanity check passed');

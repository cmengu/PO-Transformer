# PO Transformer

Drop AEM purchase-order PDFs into a web page and get tracker rows back: an editable table you can copy straight into an Outlook email, or download as Excel. PDFs are read inside the browser and never uploaded.

Status: the Quiet studio look is locked; parser and Vercel deploy are still open. Plan: wayfinder map, issue #1. Research notes: [`docs/research/`](docs/research/). Run `npm run dev` to see the demo.

All sample POs in this repo use invented values. Never commit a real client PO.

Invented fixtures live in [`fixtures/`](fixtures/). Rebuild and check them with:

```sh
npm install
npm run fixtures
npm run fixtures:check
```

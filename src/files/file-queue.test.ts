import { describe, expect, it } from 'vitest'
import {
  enqueueFiles,
  readyQueuedFiles,
  removeQueuedFile,
  updateQueuedFile,
  validatePdfFile,
} from './file-queue'

function file(name: string, content: number[], lastModified = 1): File {
  return new File([new Uint8Array(content)], name, { lastModified })
}

describe('file queue', () => {
  it('stages files without processing and skips duplicates', () => {
    const po = file('po.pdf', [0x25, 0x50, 0x44, 0x46])
    const first = enqueueFiles([], [po], () => 'one')
    const second = enqueueFiles(first.queue, [po, po], () => 'two')

    expect(first.added[0]).toMatchObject({ status: 'validating', detail: 'Checking file…' })
    expect(second.queue).toHaveLength(1)
    expect(second.skippedDuplicateCount).toBe(2)
  })

  it('validates a PDF signature before processing', async () => {
    await expect(validatePdfFile(file('po.pdf', [0x25, 0x50, 0x44, 0x46]))).resolves.toEqual({
      status: 'ready', detail: 'Queued — ready to process',
    })
    await expect(validatePdfFile(file('notes.txt', [0x25, 0x50, 0x44, 0x46]))).resolves.toEqual({
      status: 'failed', detail: 'Not a PDF',
    })
    await expect(validatePdfFile(file('not-a-pdf.pdf', [1, 2, 3, 4]))).resolves.toEqual({
      status: 'failed', detail: 'Not a PDF',
    })
  })

  it('only selects ready files for processing and preserves completed files on retry', () => {
    const staged = enqueueFiles([], [
      file('good.pdf', [0x25, 0x50, 0x44, 0x46]),
      file('bad.pdf', [1, 2, 3, 4]),
    ], (() => {
      let id = 0
      return () => String(++id)
    })())
    const ready = updateQueuedFile(staged.queue, '1', 'ready', 'Queued — ready to process')
    const failed = updateQueuedFile(ready, '2', 'failed', 'Not a PDF')
    const completed = updateQueuedFile(failed, '1', 'completed', 'Processed 1 row')

    expect(readyQueuedFiles(completed)).toEqual([])
    expect(completed.find((item) => item.id === '1')).toMatchObject({ status: 'completed' })
    expect(removeQueuedFile(completed, '2')).toHaveLength(1)
  })
})

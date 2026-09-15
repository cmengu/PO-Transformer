export type QueuedFileStatus =
  | 'validating'
  | 'ready'
  | 'processing'
  | 'completed'
  | 'failed'

export type QueuedFile = {
  id: string
  file: File
  fingerprint: string
  status: QueuedFileStatus
  detail: string
}

export type QueueEnqueueResult = {
  queue: QueuedFile[]
  added: QueuedFile[]
  skippedDuplicateCount: number
}

export type FileValidation = {
  status: 'ready' | 'failed'
  detail: string
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `file-${Date.now()}-${Math.random()}`
}

export function fileFingerprint(file: Pick<File, 'name' | 'size' | 'lastModified'>): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}`
}

export function enqueueFiles(
  queue: QueuedFile[],
  files: File[],
  createId: () => string = makeId,
): QueueEnqueueResult {
  const seen = new Set(queue.map((item) => item.fingerprint))
  const added: QueuedFile[] = []
  let skippedDuplicateCount = 0

  for (const file of files) {
    const fingerprint = fileFingerprint(file)
    if (seen.has(fingerprint)) {
      skippedDuplicateCount += 1
      continue
    }
    seen.add(fingerprint)
    added.push({
      id: createId(),
      file,
      fingerprint,
      status: 'validating',
      detail: 'Checking file…',
    })
  }

  return { queue: [...queue, ...added], added, skippedDuplicateCount }
}

export function updateQueuedFile(
  queue: QueuedFile[],
  id: string,
  status: QueuedFileStatus,
  detail: string,
): QueuedFile[] {
  return queue.map((item) =>
    item.id === id ? { ...item, status, detail } : item,
  )
}

export function removeQueuedFile(queue: QueuedFile[], id: string): QueuedFile[] {
  return queue.filter((item) => item.id !== id)
}

export function readyQueuedFiles(queue: QueuedFile[]): QueuedFile[] {
  return queue.filter((item) => item.status === 'ready')
}

export async function validatePdfFile(
  file: Pick<File, 'name' | 'slice'>,
): Promise<FileValidation> {
  if (!file.name.toLocaleLowerCase().endsWith('.pdf')) {
    return { status: 'failed', detail: 'Not a PDF' }
  }
  try {
    const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    const isPdf =
      bytes.length === 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    return isPdf
      ? { status: 'ready', detail: 'Queued — ready to process' }
      : { status: 'failed', detail: 'Not a PDF' }
  } catch {
    return { status: 'failed', detail: 'Could not read this file' }
  }
}

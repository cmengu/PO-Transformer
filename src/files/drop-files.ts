export type DroppableFileItem = {
  kind: string;
  getAsFile: () => File | null;
};

export type FileDropPayload = {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<DroppableFileItem> | null;
  types?: ArrayLike<string> | null;
};

export type DroppedFiles = {
  files: File[];
  source: "items" | "files" | "unavailable";
};

/**
 * Reads file attachments while the browser's drop event is still active.
 * Some email clients expose attachments through DataTransferItem instead of
 * DataTransfer.files, so items are deliberately preferred here.
 */
export function extractDroppedFiles(payload: FileDropPayload): DroppedFiles {
  const itemFiles = Array.from(payload.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  if (itemFiles.length > 0) return { files: itemFiles, source: "items" };

  const files = Array.from(payload.files ?? []);
  if (files.length > 0) return { files, source: "files" };
  return { files: [], source: "unavailable" };
}

export function fileDropUnavailableMessage(payload: FileDropPayload): string {
  const types = Array.from(payload.types ?? []);
  const cameFromAnotherApp = types.length > 0 || (payload.items?.length ?? 0) > 0;
  return cameFromAnotherApp
    ? "This email app did not provide the attachment as a file. Save the PDF, then choose it here."
    : "No files were received. Drag a PDF attachment or choose PDF files.";
}

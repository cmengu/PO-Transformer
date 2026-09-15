export type DroppableFileItem = {
  kind: string;
  getAsFile: () => File | null;
};

export type FileDropPayload = {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<DroppableFileItem> | null;
  types?: ArrayLike<string> | null;
};

export type ClipboardFileItem = {
  types: readonly string[];
  getType: (type: string) => Promise<Blob>;
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
  if (types.includes("text/uri-list")) {
    return "A link was received, not a PDF file. Drag or paste the PDF attachment itself.";
  }
  const cameFromAnotherApp = types.length > 0 || (payload.items?.length ?? 0) > 0;
  return cameFromAnotherApp
    ? "This email app did not provide the attachment as a file. Save the PDF, then choose it here."
    : "No files were received. Drag a PDF attachment or choose PDF files.";
}

/** Converts PDF clipboard entries into local File objects without uploading them. */
export async function extractClipboardPdfFiles(
  items: ClipboardFileItem[],
  namePrefix = "Pasted purchase order",
): Promise<File[]> {
  const pdfBlobs = await Promise.all(
    items.flatMap((item) =>
      item.types
        .filter((type) => type.toLocaleLowerCase() === "application/pdf")
        .map((type) => item.getType(type)),
    ),
  );
  return pdfBlobs.map(
    (blob, index) =>
      new File([blob], `${namePrefix}${pdfBlobs.length === 1 ? "" : ` ${index + 1}`}.pdf`, {
        type: "application/pdf",
      }),
  );
}

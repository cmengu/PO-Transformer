import { describe, expect, it } from "vitest";
import { extractDroppedFiles, fileDropUnavailableMessage } from "./drop-files";

function file(name: string): File {
  return new File(["%PDF"], name, { type: "application/pdf" });
}

describe("extractDroppedFiles", () => {
  it("prefers attachment files exposed through data-transfer items", () => {
    const attachment = file("from-outlook.pdf");
    const result = extractDroppedFiles({
      items: [
        { kind: "string", getAsFile: () => null },
        { kind: "file", getAsFile: () => attachment },
      ],
      files: [file("fallback.pdf")],
    });

    expect(result).toEqual({ files: [attachment], source: "items" });
  });

  it("falls back to a normal browser file list", () => {
    const attachment = file("from-gmail.pdf");
    expect(extractDroppedFiles({ files: [attachment] })).toEqual({
      files: [attachment],
      source: "files",
    });
  });

  it("gives a useful fallback when an email client exposes no attachment file", () => {
    expect(extractDroppedFiles({ items: [{ kind: "string", getAsFile: () => null }] }))
      .toEqual({ files: [], source: "unavailable" });
    expect(fileDropUnavailableMessage({ types: ["text/uri-list"] }))
      .toContain("Save the PDF");
  });
});

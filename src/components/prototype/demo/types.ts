import type { FileMessage, MockRow } from "./data";

export type Scene = "empty" | "loading" | "results";

export type DemoHandlers = {
  scene: Scene;
  stepLabel: string;
  fileIndex: number;
  fileCount: number;
  rows: MockRow[];
  messages: FileMessage[];
  toast: string | null;
  dragOver: boolean;
  flagCount: number;
  onDrag: (over: boolean) => void;
  onDropOrBrowse: () => void;
  onEdit: (id: string, key: string, value: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onAddMore: () => void;
  onStartOver: () => void;
};

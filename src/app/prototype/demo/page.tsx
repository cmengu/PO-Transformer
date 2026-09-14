"use client";

/**
 * Three variants of the demo flow, switchable via ?variant=, on /prototype/demo.
 * A Quiet studio / B Mail room / C Tracker sheet. Hard-coded invented rows. PROTOTYPE.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PrototypeSwitcher } from "@/components/prototype/PrototypeSwitcher";
import {
  FILE_MESSAGES,
  INVENTED_ROWS,
  LOADING_STEPS,
  type ColumnKey,
  type MockRow,
} from "@/components/prototype/demo/data";
import type { DemoHandlers, Scene } from "@/components/prototype/demo/types";
import { VariantA, variantAName } from "@/components/prototype/demo/VariantA";
import { VariantB, variantBName } from "@/components/prototype/demo/VariantB";
import { VariantC, variantCName } from "@/components/prototype/demo/VariantC";

const VARIANTS = [
  { key: "A", name: variantAName },
  { key: "B", name: variantBName },
  { key: "C", name: variantCName },
];

const SCENES = [
  { key: "empty", name: "Empty" },
  { key: "loading", name: "Loading" },
  { key: "results", name: "Results" },
];

function cloneRows(): MockRow[] {
  return INVENTED_ROWS.map((row) => ({ ...row, flags: [...row.flags] }));
}

function DemoInner() {
  const params = useSearchParams();
  const router = useRouter();
  const variant = (params.get("variant") ?? "A").toUpperCase();
  const sceneParam = (params.get("scene") ?? "empty") as Scene;
  const scene: Scene = ["empty", "loading", "results"].includes(sceneParam)
    ? sceneParam
    : "empty";

  const [rows, setRows] = useState<MockRow[]>(cloneRows);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [fileIndex, setFileIndex] = useState(1);

  useEffect(() => {
    if (scene !== "loading") {
      setStepIndex(0);
      setFileIndex(1);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed < 1400) {
        setStepIndex(0);
        setFileIndex(1);
      } else if (elapsed < 2800) {
        setStepIndex(1);
        setFileIndex(2);
      } else if (elapsed < 4000) {
        setStepIndex(2);
        setFileIndex(2);
      } else {
        window.clearInterval(timer);
        const next = new URLSearchParams(params.toString());
        next.set("variant", variant);
        next.set("scene", "results");
        router.replace(`/prototype/demo?${next.toString()}`);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [scene, params, router, variant]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const flagCount = rows.reduce((n, row) => n + row.flags.length, 0);

  const handlers: DemoHandlers = useMemo(
    () => ({
      scene,
      stepLabel: LOADING_STEPS[stepIndex] ?? LOADING_STEPS[0],
      fileIndex,
      fileCount: 2,
      rows,
      messages: FILE_MESSAGES,
      toast,
      dragOver,
      flagCount,
      onDrag: setDragOver,
      onDropOrBrowse: () => {
        const next = new URLSearchParams();
        next.set("variant", variant);
        next.set("scene", "loading");
        router.replace(`/prototype/demo?${next.toString()}`);
      },
      onEdit: (id, key, value) => {
        setRows((current) =>
          current.map((row) => {
            if (row.id !== id) return row;
            const next = { ...row, flags: [...row.flags] };
            const col = key as ColumnKey;
            if (col === "line" || col === "qty" || col === "unitPrice" || col === "total") {
              const parsed = value === "" ? null : Number(value);
              if (col === "line") next.line = Number(value) || 0;
              if (col === "qty") next.qty = parsed;
              if (col === "unitPrice") next.unitPrice = parsed;
              if (col === "total") next.total = parsed;
            } else if (col === "job" || col === "drawing" || col === "pur") {
              // stay blank-capable strings
              (next as MockRow)[col] = value as "";
            } else {
              (next as Record<string, unknown>)[col] = value;
            }
            if (col === "project" || col === "rev" || col === "requested") {
              next.flags = next.flags.filter((f) => f !== col);
            }
            return next;
          }),
        );
      },
      onCopy: () => setToast("Copied — paste into your email"),
      onDownload: () => setToast("Download is a stub in this prototype"),
      onAddMore: () => setToast("Add more POs would reopen the drop zone"),
      onStartOver: () => {
        setRows(cloneRows());
        const next = new URLSearchParams();
        next.set("variant", variant);
        next.set("scene", "empty");
        router.replace(`/prototype/demo?${next.toString()}`);
      },
    }),
    [scene, stepIndex, fileIndex, rows, toast, dragOver, flagCount, variant, router],
  );

  const View =
    variant === "B" ? VariantB : variant === "C" ? VariantC : VariantA;

  return (
    <>
      <View {...handlers} />
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant === "B" || variant === "C" ? variant : "A"}
        scenes={SCENES}
        scene={scene}
      />
    </>
  );
}

export default function PrototypeDemoPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading prototype…</div>}>
      <DemoInner />
    </Suspense>
  );
}

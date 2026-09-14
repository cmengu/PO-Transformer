"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type SwitcherProps = {
  variants: { key: string; name: string }[];
  current: string;
  scenes: { key: string; name: string }[];
  scene: string;
};

export function PrototypeSwitcher({
  variants,
  current,
  scenes,
  scene,
}: SwitcherProps) {
  const router = useRouter();
  const i = Math.max(0, variants.findIndex((v) => v.key === current));
  const currentVariant = variants[i] ?? variants[0];

  function setParams(nextVariant: string, nextScene: string) {
    const params = new URLSearchParams();
    params.set("variant", nextVariant);
    params.set("scene", nextScene);
    router.replace(`/prototype/demo?${params.toString()}`);
  }

  function cycle(delta: number) {
    const next = variants[(i + delta + variants.length) % variants.length];
    if (next) setParams(next.key, scene);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-neutral-950 px-2 py-1 text-white shadow-lg">
        <button
          type="button"
          aria-label="Previous variant"
          className="rounded-full px-3 py-1 text-lg leading-none hover:bg-white/10"
          onClick={() => cycle(-1)}
        >
          ←
        </button>
        <span className="min-w-52 px-2 text-center text-sm font-medium">
          {currentVariant?.key} — {currentVariant?.name}
        </span>
        <button
          type="button"
          aria-label="Next variant"
          className="rounded-full px-3 py-1 text-lg leading-none hover:bg-white/10"
          onClick={() => cycle(1)}
        >
          →
        </button>
      </div>
      <div className="flex gap-1 rounded-full bg-neutral-800 px-1 py-1 text-xs text-white shadow">
        {scenes.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`rounded-full px-3 py-1 ${
              scene === s.key ? "bg-white text-neutral-950" : "hover:bg-white/10"
            }`}
            onClick={() => setParams(current, s.key)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { SessionState } from "@/lib/types";

interface Props {
  state: SessionState;
  level: number;
}

const BARS = 48;

export function Waveform({ state, level }: Props) {
  const valuesRef = useRef<number[]>(Array(BARS).fill(0.05));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const target = level;
      const arr = valuesRef.current;
      // shift left, add new on right
      for (let i = 0; i < arr.length - 1; i++) {
        arr[i] = arr[i + 1] ?? 0.05;
      }
      const jitter =
        state === "idle"
          ? 0.03 + Math.random() * 0.02
          : Math.max(0.05, target * (0.5 + Math.random()));
      arr[arr.length - 1] = Math.min(1, jitter);
      const container = containerRef.current;
      if (container) {
        const children = container.children;
        for (let i = 0; i < children.length; i++) {
          const v = arr[i] ?? 0.05;
          const el = children[i] as HTMLElement | undefined;
          if (el) {
            const h = 8 + v * 80;
            el.style.height = `${h}px`;
            el.style.opacity = `${0.35 + v * 0.65}`;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, level]);

  return (
    <motion.div
      className="flex h-24 items-center justify-center gap-[3px] px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      data-testid="waveform"
    >
      <div ref={containerRef} className="flex h-full items-center gap-[3px]">
        {Array.from({ length: BARS }).map((_, i) => (
          <span
            key={i}
            className="block w-[3px] rounded-full"
            style={{
              height: 8,
              background:
                state === "speaking"
                  ? "linear-gradient(to top, #a78bfa, #22d3ee)"
                  : state === "listening"
                    ? "linear-gradient(to top, #22d3ee, #a78bfa)"
                    : "linear-gradient(to top, #6d28d9, #4c1d95)",
              boxShadow: "0 0 8px rgba(167, 139, 250, 0.5)",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

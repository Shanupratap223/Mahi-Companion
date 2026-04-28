import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { SessionState } from "@/lib/types";

interface Props {
  state: SessionState;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ state, onClick, disabled }: Props) {
  const isActive = state !== "idle";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="button-mic"
      whileTap={{ scale: 0.94 }}
      className="relative flex h-24 w-24 items-center justify-center rounded-full disabled:opacity-50"
      style={{
        background: isActive
          ? "linear-gradient(135deg, #a78bfa, #22d3ee)"
          : "linear-gradient(135deg, #4c1d95, #1e1b4b)",
        boxShadow: isActive
          ? "0 0 60px rgba(167, 139, 250, 0.7), inset 0 0 20px rgba(255,255,255,0.1)"
          : "0 0 30px rgba(124, 58, 237, 0.4), inset 0 0 12px rgba(255,255,255,0.08)",
      }}
    >
      {/* pulsing rings */}
      {isActive && (
        <>
          <motion.span
            className="absolute inset-0 rounded-full border border-white/30"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full border border-white/20"
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
          />
        </>
      )}

      {state === "connecting" ? (
        <Loader2 className="h-9 w-9 animate-spin text-white" />
      ) : state === "idle" ? (
        <Mic className="h-9 w-9 text-white" />
      ) : (
        <MicOff className="h-9 w-9 text-white" />
      )}
    </motion.button>
  );
}

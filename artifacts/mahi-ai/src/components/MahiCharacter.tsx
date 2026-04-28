import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import type { Emotion, SessionState } from "@/lib/types";

interface Props {
  emotion: Emotion;
  state: SessionState;
  level: number;
}

const EMOTION_PALETTE: Record<
  Emotion,
  { from: string; to: string; ring: string; mood: string }
> = {
  happy: { from: "#a78bfa", to: "#22d3ee", ring: "#a78bfa", mood: "Happy" },
  playful: { from: "#f472b6", to: "#a78bfa", ring: "#f472b6", mood: "Playful" },
  sad: { from: "#60a5fa", to: "#1e3a8a", ring: "#60a5fa", mood: "Soft" },
  heartbroken: {
    from: "#7c3aed",
    to: "#1e1b4b",
    ring: "#7c3aed",
    mood: "Heartbroken",
  },
  thinking: {
    from: "#818cf8",
    to: "#0ea5e9",
    ring: "#818cf8",
    mood: "Thinking",
  },
  angry: { from: "#f43f5e", to: "#7c3aed", ring: "#f43f5e", mood: "Annoyed" },
  neutral: { from: "#a78bfa", to: "#3b82f6", ring: "#a78bfa", mood: "Hay" },
};

export function MahiCharacter({ emotion, state, level }: Props) {
  const palette = EMOTION_PALETTE[emotion];

  const speakScale = useMemo(() => {
    if (state === "speaking") {
      return 1 + Math.min(0.18, level * 4);
    }
    if (state === "listening") {
      return 1 + Math.min(0.08, level * 2);
    }
    return 1;
  }, [state, level]);

  return (
    <div className="relative flex items-center justify-center" data-testid="mahi-character">
      {/* outer halo */}
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: 320,
          height: 320,
          background: `radial-gradient(circle at 50% 50%, ${palette.from}55, transparent 70%)`,
        }}
        animate={{
          opacity: state === "idle" ? [0.4, 0.7, 0.4] : 0.85,
          scale: state === "idle" ? [1, 1.05, 1] : speakScale,
        }}
        transition={{
          duration: state === "idle" ? 4 : 0.18,
          repeat: state === "idle" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* secondary halo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 240,
          height: 240,
          background: `radial-gradient(circle at 30% 30%, ${palette.from}, ${palette.to})`,
          filter: "blur(40px)",
        }}
        animate={{
          opacity: 0.55,
          scale: state === "speaking" ? speakScale : [0.95, 1.02, 0.95],
        }}
        transition={{
          duration: state === "speaking" ? 0.15 : 5,
          repeat: state === "speaking" ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />

      {/* orb */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={emotion}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: speakScale }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative h-44 w-44 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${palette.from}, ${palette.to} 70%, #0a0014 110%)`,
            boxShadow: `0 0 80px ${palette.ring}66, inset 0 0 40px rgba(255,255,255,0.1)`,
          }}
        >
          {/* shimmer */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${palette.from}33, transparent 60%)`,
              mixBlendMode: "screen",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />

          {/* face */}
          <CharacterFace emotion={emotion} />

          {/* highlight */}
          <div
            className="absolute left-6 top-6 h-12 w-12 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85), transparent 70%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* mood label */}
      <motion.div
        key={`label-${emotion}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 0.85, y: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute -bottom-12 select-none text-xs uppercase tracking-[0.4em]"
        style={{ color: palette.from }}
      >
        Mahi · {palette.mood}
      </motion.div>
    </div>
  );
}

function CharacterFace({ emotion }: { emotion: Emotion }) {
  const eyeY = emotion === "thinking" ? 80 : 84;
  const eyeShape =
    emotion === "happy" || emotion === "playful"
      ? "happy"
      : emotion === "sad" || emotion === "heartbroken"
        ? "sad"
        : emotion === "angry"
          ? "angry"
          : emotion === "thinking"
            ? "thinking"
            : "neutral";

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 176 176"
      fill="none"
    >
      <defs>
        <radialGradient id="eyeGlow" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f5f3ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ddd6fe" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* eyes */}
      {eyeShape === "neutral" && (
        <>
          <ellipse cx="62" cy={eyeY} rx="6" ry="9" fill="url(#eyeGlow)" />
          <ellipse cx="114" cy={eyeY} rx="6" ry="9" fill="url(#eyeGlow)" />
        </>
      )}
      {eyeShape === "happy" && (
        <>
          <path
            d={`M 52 ${eyeY} Q 62 ${eyeY - 8} 72 ${eyeY}`}
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M 104 ${eyeY} Q 114 ${eyeY - 8} 124 ${eyeY}`}
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      {eyeShape === "sad" && (
        <>
          <ellipse cx="62" cy={eyeY + 4} rx="5" ry="7" fill="url(#eyeGlow)" />
          <ellipse cx="114" cy={eyeY + 4} rx="5" ry="7" fill="url(#eyeGlow)" />
          {emotion === "heartbroken" && (
            <>
              <ellipse cx="60" cy="98" rx="2.5" ry="6" fill="#a5b4fc" opacity="0.85" />
              <ellipse cx="116" cy="98" rx="2.5" ry="6" fill="#a5b4fc" opacity="0.85" />
            </>
          )}
        </>
      )}
      {eyeShape === "angry" && (
        <>
          <path
            d={`M 52 ${eyeY - 6} L 72 ${eyeY - 2}`}
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={`M 104 ${eyeY - 2} L 124 ${eyeY - 6}`}
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <ellipse cx="62" cy={eyeY + 2} rx="4" ry="5" fill="url(#eyeGlow)" />
          <ellipse cx="114" cy={eyeY + 2} rx="4" ry="5" fill="url(#eyeGlow)" />
        </>
      )}
      {eyeShape === "thinking" && (
        <>
          <ellipse cx="62" cy={eyeY} rx="5" ry="8" fill="url(#eyeGlow)" />
          <ellipse cx="118" cy={eyeY - 2} rx="5" ry="8" fill="url(#eyeGlow)" />
        </>
      )}

      {/* mouth */}
      <Mouth emotion={emotion} />
    </svg>
  );
}

function Mouth({ emotion }: { emotion: Emotion }) {
  const baseY = 122;
  if (emotion === "happy" || emotion === "playful") {
    return (
      <path
        d={`M 70 ${baseY} Q 88 ${baseY + 14} 106 ${baseY}`}
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (emotion === "sad") {
    return (
      <path
        d={`M 70 ${baseY + 6} Q 88 ${baseY - 4} 106 ${baseY + 6}`}
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (emotion === "heartbroken") {
    return (
      <>
        <path
          d={`M 70 ${baseY + 8} Q 88 ${baseY - 6} 106 ${baseY + 8}`}
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <path
          d={`M 78 ${baseY + 14} L 82 ${baseY + 18} L 86 ${baseY + 14}`}
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </>
    );
  }
  if (emotion === "angry") {
    return (
      <path
        d={`M 70 ${baseY + 4} L 106 ${baseY + 4}`}
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
      />
    );
  }
  if (emotion === "thinking") {
    return (
      <path
        d={`M 76 ${baseY + 4} Q 88 ${baseY - 2} 100 ${baseY + 4}`}
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <path
      d={`M 76 ${baseY + 2} Q 88 ${baseY + 6} 100 ${baseY + 2}`}
      stroke="#fff"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
  );
}

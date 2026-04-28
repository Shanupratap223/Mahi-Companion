import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Brain, X } from "lucide-react";
import { MahiCharacter } from "@/components/MahiCharacter";
import { MicButton } from "@/components/MicButton";
import { Waveform } from "@/components/Waveform";
import { LiveSession, summarizeConversation } from "@/lib/live-session";
import { AudioStreamer } from "@/lib/audio-streamer";
import { AudioPlayer } from "@/lib/audio-player";
import {
  appendMemory,
  clearApiKey,
  clearMemory,
  getApiKey,
  getMemory,
} from "@/lib/storage";
import type { Emotion, SessionState, Transcript } from "@/lib/types";

interface Props {
  onSignOut: () => void;
}

const STATUS_LABEL: Record<SessionState, string> = {
  idle: "tap to start",
  connecting: "connecting…",
  listening: "listening",
  speaking: "speaking",
};

export function Home({ onSignOut }: Props) {
  const [state, setState] = useState<SessionState>("idle");
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [transcript, setTranscript] = useState<Transcript[]>([]);

  const sessionRef = useRef<LiveSession | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const userBufRef = useRef<string>("");
  const modelBufRef = useRef<string>("");
  const transcriptRef = useRef<Transcript[]>([]);

  const stopAll = useCallback(async () => {
    try {
      streamerRef.current?.stop();
    } catch {
      /* noop */
    }
    streamerRef.current = null;
    try {
      await playerRef.current?.dispose();
    } catch {
      /* noop */
    }
    playerRef.current = null;
    try {
      sessionRef.current?.close();
    } catch {
      /* noop */
    }
    sessionRef.current = null;
  }, []);

  const flushUserText = useCallback(() => {
    const text = userBufRef.current.trim();
    if (text) {
      const entry: Transcript = { role: "user", text, at: Date.now() };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript([...transcriptRef.current]);
    }
    userBufRef.current = "";
  }, []);

  const flushModelText = useCallback(() => {
    const text = modelBufRef.current.trim();
    if (text) {
      const entry: Transcript = { role: "mahi", text, at: Date.now() };
      transcriptRef.current = [...transcriptRef.current, entry];
      setTranscript([...transcriptRef.current]);
    }
    modelBufRef.current = "";
  }, []);

  const endSession = useCallback(
    async (apiKey: string) => {
      flushUserText();
      flushModelText();
      const text = transcriptRef.current
        .map((t) => `${t.role === "user" ? "Mahendra" : "Mahi"}: ${t.text}`)
        .join("\n");
      await stopAll();
      setState("idle");
      setLevel(0);
      if (text.trim().length > 0) {
        const summary = await summarizeConversation(apiKey, text);
        if (summary.trim()) {
          appendMemory({
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            summary,
          });
        }
      }
      transcriptRef.current = [];
      setTranscript([]);
    },
    [flushModelText, flushUserText, stopAll],
  );

  const startSession = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError("API key missing. Please sign in again.");
      return;
    }
    setError(null);
    setState("connecting");
    setEmotion("neutral");
    transcriptRef.current = [];
    setTranscript([]);

    // Create + unlock the audio player synchronously inside the user click
    // so iOS/Safari permits playback for the rest of the session.
    const player = new AudioPlayer({
      onPlaybackStart: () => setState("speaking"),
      onPlaybackEnd: () => setState((s) => (s === "speaking" ? "listening" : s)),
    });
    playerRef.current = player;
    void player.unlock();

    const memory = getMemory();
    const memorySummary = memory
      .slice(-5)
      .map((m) => m.summary)
      .join("\n---\n");

    const session = new LiveSession(apiKey, {
      onAudio: (b64) => {
        void player.enqueue(b64);
      },
      onInterrupted: () => {
        player.stop();
        flushModelText();
        setState("listening");
      },
      onTurnComplete: () => {
        flushModelText();
      },
      onSetupComplete: () => {
        /* ready */
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : "Connection error.";
        setError(msg);
      },
      onClose: () => {
        setState("idle");
      },
      onUserText: (t) => {
        userBufRef.current += t;
      },
      onModelText: (t) => {
        modelBufRef.current += t;
      },
      tools: {
        updateCharacterState: ({ emotion }) => setEmotion(emotion),
        openWebsite: ({ url }) => {
          try {
            const safe =
              url.startsWith("http://") || url.startsWith("https://")
                ? url
                : `https://${url}`;
            window.open(safe, "_blank", "noopener,noreferrer");
          } catch {
            /* noop */
          }
        },
      },
    });
    sessionRef.current = session;

    try {
      await session.connect(memorySummary || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect.";
      setError(msg);
      await stopAll();
      setState("idle");
      return;
    }

    const streamer = new AudioStreamer({
      onChunk: (b64) => {
        sessionRef.current?.sendAudio(b64);
      },
      onLevel: (l) => setLevel(l),
      onSpeechStart: () => {
        if (playerRef.current?.isPlaying()) {
          playerRef.current.stop();
        }
        flushModelText();
        setState("listening");
      },
      onSpeechEnd: () => {
        flushUserText();
      },
    });
    streamerRef.current = streamer;

    try {
      await streamer.start();
      setState("listening");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Microphone permission denied.";
      setError(msg);
      await stopAll();
      setState("idle");
    }
  }, [flushModelText, flushUserText, stopAll]);

  const handleMicClick = useCallback(() => {
    if (state === "idle") {
      void startSession();
    } else {
      const key = getApiKey();
      if (key) void endSession(key);
      else void stopAll().then(() => setState("idle"));
    }
  }, [endSession, startSession, state, stopAll]);

  useEffect(() => {
    return () => {
      void stopAll();
    };
  }, [stopAll]);

  const handleSignOut = useCallback(async () => {
    await stopAll();
    clearApiKey();
    onSignOut();
  }, [onSignOut, stopAll]);

  const memory = getMemory();

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden">
      <BackgroundOrbs emotion={emotion} state={state} />

      {/* top bar */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col"
        >
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Mahi <span aria-hidden>💙</span>
          </h1>
          <AnimatePresence mode="wait">
            <motion.span
              key={state}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 0.7, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] uppercase tracking-[0.3em] text-white/60"
              data-testid="text-status"
            >
              {STATUS_LABEL[state]}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMemoryOpen(true)}
            data-testid="button-memory"
            className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/80 backdrop-blur-md transition hover:bg-white/10"
          >
            <Brain className="h-3.5 w-3.5" />
            <span>{memory.length}</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            data-testid="button-signout"
            aria-label="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 backdrop-blur-md transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* center character */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-16 px-6 pb-8">
        <MahiCharacter emotion={emotion} state={state} level={level} />

        <div className="flex flex-col items-center gap-6">
          <MicButton state={state} onClick={handleMicClick} />
          <p className="text-center text-xs text-white/50">
            {state === "idle"
              ? "tap the mic and start talking"
              : "tap again to end the chat"}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs text-rose-200"
            data-testid="text-error"
          >
            {error}
          </motion.div>
        )}
      </main>

      {/* bottom waveform */}
      <footer className="relative z-10 pb-8">
        <Waveform state={state} level={level} />
      </footer>

      {/* memory drawer */}
      <AnimatePresence>
        {memoryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            onClick={() => setMemoryOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0c0617]/95 p-6 backdrop-blur-xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    What Mahi remembers
                  </h2>
                  <p className="text-xs text-white/50">
                    Summaries from past chats — saved on your device only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMemoryOpen(false)}
                  data-testid="button-close-memory"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {memory.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    Nothing saved yet. After you finish a conversation, a short
                    summary will appear here.
                  </p>
                ) : (
                  memory
                    .slice()
                    .reverse()
                    .map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-white/85">
                          {m.summary}
                        </p>
                      </div>
                    ))
                )}
              </div>

              {memory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearMemory();
                    setMemoryOpen(false);
                  }}
                  data-testid="button-clear-memory"
                  className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-white/70 transition hover:bg-white/10"
                >
                  Clear all memories
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* live transcript ticker (subtle) */}
      <AnimatePresence>
        {transcript.length > 0 && state !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center px-6"
          >
            <div className="max-w-md text-center text-[11px] leading-snug text-white/35">
              {transcript[transcript.length - 1]?.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BackgroundOrbs({
  emotion,
  state,
}: {
  emotion: Emotion;
  state: SessionState;
}) {
  const colors: Record<Emotion, [string, string]> = {
    happy: ["rgba(167,139,250,0.5)", "rgba(34,211,238,0.35)"],
    playful: ["rgba(244,114,182,0.5)", "rgba(167,139,250,0.4)"],
    sad: ["rgba(96,165,250,0.4)", "rgba(30,58,138,0.4)"],
    heartbroken: ["rgba(124,58,237,0.4)", "rgba(30,27,75,0.45)"],
    thinking: ["rgba(129,140,248,0.4)", "rgba(14,165,233,0.4)"],
    angry: ["rgba(244,63,94,0.45)", "rgba(124,58,237,0.4)"],
    neutral: ["rgba(167,139,250,0.45)", "rgba(34,211,238,0.35)"],
  };
  const [a, b] = colors[emotion];
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-[520px] w-[520px] rounded-full blur-[140px]"
        animate={{
          background: `radial-gradient(circle, ${a}, transparent 70%)`,
          scale: state === "speaking" ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: state === "speaking" ? 1.2 : 0.8, repeat: state === "speaking" ? Infinity : 0 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-0 h-[560px] w-[560px] rounded-full blur-[160px]"
        animate={{
          background: `radial-gradient(circle, ${b}, transparent 70%)`,
        }}
        transition={{ duration: 0.8 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </>
  );
}

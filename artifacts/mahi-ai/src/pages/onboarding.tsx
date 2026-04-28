import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, KeyRound, ExternalLink, PlayCircle, Loader2 } from "lucide-react";
import { setApiKey } from "@/lib/storage";
import { validateApiKey } from "@/lib/live-session";

interface Props {
  onReady: () => void;
}

export function Onboarding({ onReady }: Props) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setStatus("error");
      setErrorMsg("Please paste your Gemini API key first.");
      return;
    }
    setStatus("checking");
    setErrorMsg("");
    const ok = await validateApiKey(key.trim());
    if (ok) {
      setApiKey(key.trim());
      onReady();
    } else {
      setStatus("error");
      setErrorMsg("That key didn't work. Double-check and try again.");
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-6 py-10">
      <BackgroundOrbs />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
              boxShadow: "0 0 40px rgba(167, 139, 250, 0.6)",
            }}
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Meet <span style={{ color: "#a78bfa" }}>Mahi</span>{" "}
            <span aria-hidden>💙</span>
          </h1>
          <p className="text-sm text-white/60">
            Your real-time voice companion. Drop your Gemini key to start
            talking — it never leaves this device.
          </p>
        </div>

        <div
          className="rounded-3xl border border-white/10 p-6 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(167,139,250,0.05))",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">
              Google Gemini API Key
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                placeholder="AIzaSy..."
                data-testid="input-api-key"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/30"
              />
            </div>

            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-rose-300"
                data-testid="text-error"
              >
                {errorMsg}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={status === "checking"}
              data-testid="button-continue"
              className="relative mt-2 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                boxShadow: "0 0 30px rgba(167, 139, 250, 0.45)",
              }}
            >
              {status === "checking" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating…
                </>
              ) : (
                <>Continue</>
              )}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-create-key"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/80 transition hover:bg-white/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Create API Key
            </a>
            <button
              type="button"
              onClick={() =>
                window.open("https://aistudio.google.com/app/apikey", "_blank")
              }
              data-testid="button-tutorial"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/80 transition hover:bg-white/10"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Watch Tutorial
            </button>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-white/40">
            Stored only in your browser's localStorage. Validated against{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 text-white/70">
              gemini-2.5-flash
            </code>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.55), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-32 h-[520px] w-[520px] rounded-full blur-[140px]"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)",
        }}
      />
    </>
  );
}

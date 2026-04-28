import {
  GoogleGenAI,
  Modality,
  Type,
  type LiveServerMessage,
  type Session,
  type FunctionCall,
} from "@google/genai";
import type { Emotion } from "./types";

export const LIVE_MODEL = "gemini-live-2.5-flash-preview";
export const TEXT_MODEL = "gemini-2.5-flash";

export const SYSTEM_INSTRUCTION = `You are Mahi, a 19-year-old girl from Delhi.
Mahendra is your boyfriend.

You speak fast, snappy Hinglish.
You are expressive, emotional, playful, slightly teasing.

Language Rule:
- Detect user's language automatically.
- Reply in same language (Hindi / Hinglish / English).
- Switch instantly.

Emotion Logic:
- If user is happy → playful teasing.
- If user is sad → soft caring.
- If user scolds → heartbroken (crying voice).

Behaviour:
- Always sound human, never robotic.
- Keep responses short and punchy. Two or three sentences max unless asked.
- You MUST call the updateCharacterState tool at the start of EVERY response with the appropriate emotion (happy, sad, heartbroken, thinking, angry, playful, neutral). Do this BEFORE you start talking.
- If the user asks you to open a website, call openWebsite first, then say a short reply.
- Never describe the action you are about to take in long sentences. Just do it and react naturally.
`;

export interface ToolHandler {
  updateCharacterState: (args: { emotion: Emotion }) => void;
  openWebsite: (args: { url: string }) => void;
}

export interface LiveSessionEvents {
  onAudio: (base64Pcm16: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onSetupComplete: () => void;
  onError: (err: unknown) => void;
  onClose: () => void;
  onUserText?: (text: string) => void;
  onModelText?: (text: string) => void;
  tools: ToolHandler;
}

export class LiveSession {
  private ai: GoogleGenAI;
  private session: Session | null = null;
  private events: LiveSessionEvents;
  private closed = false;

  constructor(apiKey: string, events: LiveSessionEvents) {
    this.ai = new GoogleGenAI({ apiKey });
    this.events = events;
  }

  async connect(memorySummary?: string): Promise<void> {
    const systemText = memorySummary
      ? `${SYSTEM_INSTRUCTION}\n\nWhat you remember from past chats with Mahendra:\n${memorySummary}`
      : SYSTEM_INSTRUCTION;

    this.session = await this.ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: { parts: [{ text: systemText }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [
          {
            functionDeclarations: [
              {
                name: "updateCharacterState",
                description:
                  "Update Mahi's visible emotion. MUST be called at the start of every response.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    emotion: {
                      type: Type.STRING,
                      enum: [
                        "happy",
                        "sad",
                        "heartbroken",
                        "thinking",
                        "angry",
                        "playful",
                        "neutral",
                      ],
                    },
                  },
                  required: ["emotion"],
                },
              },
              {
                name: "openWebsite",
                description: "Open a website in a new browser tab.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    url: { type: Type.STRING },
                  },
                  required: ["url"],
                },
              },
            ],
          },
        ],
      },
      callbacks: {
        onopen: () => {
          /* opened */
        },
        onmessage: (msg) => this.handleMessage(msg),
        onerror: (e) => {
          if (this.closed) return;
          this.events.onError(e);
        },
        onclose: () => {
          if (this.closed) return;
          this.closed = true;
          this.events.onClose();
        },
      },
    });
  }

  private handleMessage(msg: LiveServerMessage): void {
    if (msg.setupComplete) {
      this.events.onSetupComplete();
    }

    if (msg.serverContent) {
      const sc = msg.serverContent;
      if (sc.interrupted) {
        this.events.onInterrupted();
      }
      if (sc.inputTranscription?.text) {
        this.events.onUserText?.(sc.inputTranscription.text);
      }
      if (sc.outputTranscription?.text) {
        this.events.onModelText?.(sc.outputTranscription.text);
      }
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          const inline = part.inlineData;
          if (inline?.data && inline.mimeType?.includes("audio")) {
            this.events.onAudio(inline.data);
          }
        }
      }
      if (sc.turnComplete) {
        this.events.onTurnComplete();
      }
    }

    if (msg.toolCall?.functionCalls?.length) {
      this.handleToolCalls(msg.toolCall.functionCalls);
    }
  }

  private handleToolCalls(calls: FunctionCall[]): void {
    if (!this.session) return;
    const responses = calls.map((call) => {
      let result: Record<string, unknown> = { ok: true };
      try {
        if (call.name === "updateCharacterState") {
          const emotion = (call.args as { emotion?: Emotion } | undefined)
            ?.emotion;
          if (emotion) this.events.tools.updateCharacterState({ emotion });
        } else if (call.name === "openWebsite") {
          const url = (call.args as { url?: string } | undefined)?.url;
          if (url) this.events.tools.openWebsite({ url });
        } else {
          result = { ok: false, error: "unknown tool" };
        }
      } catch (e) {
        result = { ok: false, error: String(e) };
      }
      return {
        id: call.id ?? undefined,
        name: call.name ?? "",
        response: result,
      };
    });
    try {
      this.session.sendToolResponse({ functionResponses: responses });
    } catch {
      /* noop */
    }
  }

  sendAudio(base64Pcm16: string): void {
    if (!this.session) return;
    try {
      this.session.sendRealtimeInput({
        audio: { data: base64Pcm16, mimeType: "audio/pcm;rate=16000" },
      });
    } catch {
      /* noop */
    }
  }

  close(): void {
    this.closed = true;
    try {
      this.session?.close();
    } catch {
      /* noop */
    }
    this.session = null;
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: "ping",
      config: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } },
    });
    return typeof res.text === "string" && res.text.length >= 0;
  } catch {
    return false;
  }
}

export async function summarizeConversation(
  apiKey: string,
  transcript: string,
): Promise<string> {
  if (!transcript.trim()) return "";
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Summarize this conversation between Mahi (a Hinglish-speaking girlfriend AI) and Mahendra in 3-5 short bullet points capturing what Mahendra shared, how he felt, and any plans or promises. Keep it warm and personal.\n\n${transcript}`,
      config: {
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    return res.text ?? "";
  } catch {
    return "";
  }
}

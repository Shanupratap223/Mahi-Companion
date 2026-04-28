export type Emotion =
  | "happy"
  | "sad"
  | "heartbroken"
  | "thinking"
  | "angry"
  | "playful"
  | "neutral";

export type SessionState = "idle" | "connecting" | "listening" | "speaking";

export interface Transcript {
  role: "user" | "mahi";
  text: string;
  at: number;
}

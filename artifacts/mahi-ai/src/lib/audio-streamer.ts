import {
  downsampleBuffer,
  float32ToPCM16,
  int16ToBase64,
  rms,
} from "./audio-utils";

export interface AudioStreamerEvents {
  onChunk: (base64Pcm16: string) => void;
  onLevel?: (level: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

const TARGET_SAMPLE_RATE = 16000;
const VAD_THRESHOLD = 0.025;
const VAD_HANGOVER_MS = 600;

export class AudioStreamer {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private events: AudioStreamerEvents;
  private isSpeaking = false;
  private lastVoiceAt = 0;
  private running = false;

  constructor(events: AudioStreamerEvents) {
    this.events = events;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.context = new Ctx({ sampleRate: 48000 });
    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.source = this.context.createMediaStreamSource(this.stream);

    const bufferSize = 4096;
    this.processor = this.context.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.running) return;
      const input = e.inputBuffer.getChannelData(0);
      const inputCopy = new Float32Array(input.length);
      inputCopy.set(input);

      const level = rms(inputCopy);
      this.events.onLevel?.(level);

      const now = performance.now();
      if (level > VAD_THRESHOLD) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.events.onSpeechStart?.();
        }
        this.lastVoiceAt = now;
      } else if (this.isSpeaking && now - this.lastVoiceAt > VAD_HANGOVER_MS) {
        this.isSpeaking = false;
        this.events.onSpeechEnd?.();
      }

      const inputRate = this.context?.sampleRate ?? 48000;
      const downsampled = downsampleBuffer(
        inputCopy,
        inputRate,
        TARGET_SAMPLE_RATE,
      );
      const pcm16 = float32ToPCM16(downsampled);
      const b64 = int16ToBase64(pcm16);
      this.events.onChunk(b64);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  async stop(): Promise<void> {
    this.running = false;
    try {
      this.processor?.disconnect();
    } catch {
      /* noop */
    }
    try {
      this.source?.disconnect();
    } catch {
      /* noop */
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    if (this.context && this.context.state !== "closed") {
      try {
        await this.context.close();
      } catch {
        /* noop */
      }
    }
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.context = null;
    this.isSpeaking = false;
  }
}

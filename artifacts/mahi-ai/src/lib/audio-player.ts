import { base64ToInt16, pcm16ToFloat32 } from "./audio-utils";

export interface AudioPlayerEvents {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

const OUTPUT_SAMPLE_RATE = 24000;

export class AudioPlayer {
  private context: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private events: AudioPlayerEvents;
  private playing = false;

  constructor(events: AudioPlayerEvents = {}) {
    this.events = events;
  }

  private async ensureContext(): Promise<AudioContext> {
    if (!this.context || this.context.state === "closed") {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.context = new Ctx({ sampleRate: OUTPUT_SAMPLE_RATE });
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    return this.context;
  }

  async enqueue(base64Pcm16: string): Promise<void> {
    const ctx = await this.ensureContext();
    const pcm16 = base64ToInt16(base64Pcm16);
    const float32 = pcm16ToFloat32(pcm16);
    if (float32.length === 0) return;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime + 0.02, this.nextPlayTime);
    source.start(startAt);
    this.nextPlayTime = startAt + buffer.duration;

    this.activeSources.add(source);
    if (!this.playing) {
      this.playing = true;
      this.events.onPlaybackStart?.();
    }

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.playing = false;
        this.events.onPlaybackEnd?.();
      }
    };
  }

  stop(): void {
    this.activeSources.forEach((s) => {
      try {
        s.onended = null;
        s.stop();
        s.disconnect();
      } catch {
        /* noop */
      }
    });
    this.activeSources.clear();
    if (this.context) {
      this.nextPlayTime = this.context.currentTime;
    } else {
      this.nextPlayTime = 0;
    }
    if (this.playing) {
      this.playing = false;
      this.events.onPlaybackEnd?.();
    }
  }

  async dispose(): Promise<void> {
    this.stop();
    if (this.context && this.context.state !== "closed") {
      try {
        await this.context.close();
      } catch {
        /* noop */
      }
    }
    this.context = null;
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

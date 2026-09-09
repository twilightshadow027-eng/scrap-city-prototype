export interface AudioSettings {
  music: boolean;
  musicVolume: number;
  sfx: boolean;
  sfxVolume: number;
  effects: "low" | "high";
}

export type SoundName = "collect" | "attach" | "repel" | "boost" | "hit" | "extract" | "buy";

export class ScrapAudio {
  private context: AudioContext | null = null;
  private ambient: OscillatorNode[] = [];
  private ambientGain: GainNode | null = null;

  private ensure() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  sync(settings: AudioSettings) {
    if (!settings.music) {
      this.stopAmbient();
      return;
    }
    const context = this.ensure();
    if (!this.ambientGain) {
      const gain = context.createGain();
      gain.connect(context.destination);
      this.ambientGain = gain;
      for (const [frequency, detune] of [[55, -7], [82.5, 5], [110, 0]] as const) {
        const oscillator = context.createOscillator();
        oscillator.type = frequency === 55 ? "sawtooth" : "sine";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune;
        oscillator.connect(gain);
        oscillator.start();
        this.ambient.push(oscillator);
      }
    }
    this.ambientGain.gain.setTargetAtTime(settings.musicVolume * 0.035, context.currentTime, 0.2);
  }

  play(name: SoundName, settings: AudioSettings) {
    if (!settings.sfx) return;
    const context = this.ensure();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies: Record<SoundName, [number, number, OscillatorType]> = {
      collect: [520, 760, "sine"],
      attach: [180, 460, "square"],
      repel: [160, 70, "sawtooth"],
      boost: [90, 250, "sawtooth"],
      hit: [120, 45, "square"],
      extract: [260, 880, "sine"],
      buy: [420, 960, "triangle"],
    };
    const [start, end, type] = frequencies[name];
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), context.currentTime + 0.16);
    gain.gain.setValueAtTime(settings.sfxVolume * 0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.21);
  }

  stopAmbient() {
    for (const oscillator of this.ambient) oscillator.stop();
    this.ambient = [];
    this.ambientGain?.disconnect();
    this.ambientGain = null;
  }
}
type RollSound = 'throw' | 'clack' | 'yamada' | 'free' | 'half' | 'double';

/** All sounds are synthesized locally: no external assets or network requests. */
export class SoundEngine {
  private context: AudioContext | null = null;
  enabled = true;
  private lastClack = 0;

  async unlock() {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
  }

  toggle() { this.enabled = !this.enabled; return this.enabled; }

  private tone(frequency: number, start: number, duration: number, volume = 0.1, type: OscillatorType = 'sine', endFrequency?: number) {
    if (!this.context || !this.enabled) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start); oscillator.stop(start + duration + 0.02);
  }

  private noise(start: number, duration: number, volume: number, frequency = 1500) {
    if (!this.context || !this.enabled) return;
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 1.4;
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
  }

  play(sound: RollSound) {
    if (!this.context || !this.enabled) return;
    const t = this.context.currentTime;
    if (sound === 'clack') {
      if (t - this.lastClack < 0.07) return;
      this.lastClack = t;
      this.noise(t, 0.055, 0.1, 2500);
      this.tone(450 + Math.random() * 350, t, 0.065, 0.055, 'triangle', 140);
    } else if (sound === 'throw') {
      this.noise(t, 0.18, 0.065, 900);
      this.tone(280, t, 0.18, 0.055, 'sine', 100);
    } else if (sound === 'half') {
      [523, 659].forEach((f, i) => this.tone(f, t + i * 0.13, 0.22, 0.1, 'sine'));
    } else if (sound === 'free') {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, 0.4, 0.1, 'triangle'));
    } else if (sound === 'yamada') {
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => {
        this.tone(f, t + i * 0.105, 0.55, 0.11, 'triangle');
        this.tone(f * 1.5, t + i * 0.105, 0.3, 0.035, 'sine');
      });
    } else {
      this.tone(220, t, 0.4, 0.12, 'sawtooth', 80);
      this.tone(165, t + 0.25, 0.45, 0.1, 'sawtooth', 60);
    }
  }
}

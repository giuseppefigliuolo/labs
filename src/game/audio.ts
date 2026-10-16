import type { SliceSound } from '../config'

type ToneOpts = { delay?: number; type?: OscillatorType; to?: number; vol?: number; attack?: number }
type NoiseOpts = { delay?: number; filter?: BiquadFilterType; q?: number; f?: number; to?: number; vol?: number; attack?: number }
export type SfxName = 'swoosh' | 'pop' | 'bug' | 'perfect' | 'reveal' | 'miss' | 'start' | 'complete'

/** Procedural WebAudio sound effects. Nothing is loaded from disk. */
export class Sfx {
  private ac: AudioContext | null = null
  private master!: GainNode
  private noiseBuf!: AudioBuffer
  private enabled: () => boolean
  private sliceKind: SliceSound

  constructor(enabled: () => boolean, sliceKind: SliceSound) {
    this.enabled = enabled
    this.sliceKind = sliceKind
  }

  /** Lazily creates (and resumes) the context; call from a user gesture. */
  ctx() {
    if (!this.enabled()) return null
    try {
      if (!this.ac) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) return null
        const ac = this.ac = new AC()
        const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4
        this.master = ac.createGain(); this.master.gain.value = 0.7; this.master.connect(comp); comp.connect(ac.destination)
        const b = this.noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      }
      if (this.ac.state === 'suspended') this.ac.resume()
      return this.ac
    } catch {
      return null
    }
  }

  setMuted(m: boolean) {
    if (this.ac) this.master.gain.value = m ? 0 : 0.7
  }

  close() {
    this.ac?.close()
  }

  tone(f: number, dur: number, o: ToneOpts = {}) {
    const ac = this.ctx(); if (!ac) return
    const t0 = ac.currentTime + (o.delay || 0), osc = ac.createOscillator(), g = ac.createGain()
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t0)
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g); g.connect(this.master); osc.start(t0); osc.stop(t0 + dur + 0.05)
  }

  noise(dur: number, o: NoiseOpts = {}) {
    const ac = this.ctx(); if (!ac) return
    const t0 = ac.currentTime + (o.delay || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain()
    src.buffer = this.noiseBuf; src.loop = true; f.type = o.filter || 'bandpass'; f.Q.value = o.q ?? 1; f.frequency.setValueAtTime(o.f || 1000, t0)
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05)
  }

  play(name: SfxName, x: { speed?: number; f?: number; n?: number } = {}) {
    if (!this.ctx()) return
    if (name === 'swoosh') { const s = Math.min(x.speed || 1, 4); this.noise(0.16 + s * 0.03, { f: 500 + s * 300, to: 2600 + s * 900, q: 0.9, vol: Math.min(0.32, 0.07 + s * 0.06), attack: 0.02 }) }
    else if (name === 'pop') {
      if (this.sliceKind !== 'originale') return this.slice(this.sliceKind, x.n || 1)
      const f = x.f || 660
      this.tone(f, 0.16, { to: f * 0.55, vol: 0.28 }); this.tone(f * 2, 0.07, { type: 'triangle', vol: 0.08 }); this.noise(0.05, { filter: 'highpass', f: 3500, vol: 0.18, attack: 0.002 }); this.noise(0.2, { filter: 'lowpass', f: 900, to: 200, vol: 0.22, attack: 0.005 })
    }
    else if (name === 'bug') { this.tone(120, 0.55, { type: 'sawtooth', to: 38, vol: 0.22 }); this.tone(62, 0.6, { type: 'square', to: 30, vol: 0.1 }); this.noise(0.45, { filter: 'lowpass', f: 1200, to: 120, vol: 0.45, attack: 0.003 }) }
    else if (name === 'perfect') { [1568, 2093, 3136].forEach((f, i) => this.tone(f, 0.6, { delay: i * 0.05, vol: [0.14, 0.12, 0.05][i], attack: 0.005 })) }
    else if (name === 'reveal') { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, { delay: i * 0.07, type: 'triangle', vol: 0.12 })); this.noise(0.9, { f: 800, to: 6000, q: 0.6, vol: 0.06, attack: 0.3 }) }
    else if (name === 'miss') { this.tone(200, 0.28, { to: 80, vol: 0.2, type: 'triangle' }) }
    else if (name === 'start') { this.noise(0.5, { f: 300, to: 4000, q: 0.8, vol: 0.15, attack: 0.15 }); this.tone(392, 0.25, { type: 'triangle', vol: 0.1, delay: 0.1 }); this.tone(784, 0.4, { type: 'triangle', vol: 0.1, delay: 0.2 }) }
    else if (name === 'complete') { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.5, { delay: i * 0.08, type: 'triangle', vol: 0.11 })); [523, 659, 784].forEach(f => this.tone(f, 1.8, { delay: 0.6, vol: 0.07, attack: 0.05 })); this.noise(1.6, { f: 2000, to: 9000, q: 0.5, vol: 0.05, attack: 0.4, delay: 0.5 }) }
  }

  /** Fruit-cut sound; pitch climbs with the number of hits in one stroke. */
  private slice(kind: SliceSound, n: number) {
    const r = 0.9 + Math.random() * 0.2, up = Math.pow(1.06, Math.min(n - 1, 6)) * r
    if (kind === 'succoso') {
      this.noise(0.09, { f: 3200 * up, to: 1100 * up, q: 1.4, vol: 0.2, attack: 0.004 })
      this.noise(0.22, { filter: 'lowpass', f: 1600 * up, to: 260, q: 4, vol: 0.3, attack: 0.006, delay: 0.015 })
      ;[0.03, 0.06, 0.1].forEach((d, i) => this.noise(0.05, { f: (900 - i * 180) * up, q: 6, vol: 0.12 - i * 0.03, attack: 0.003, delay: d }))
      this.tone(170 * up, 0.12, { to: 70, vol: 0.18, attack: 0.003 })
    } else if (kind === 'anguria') {
      this.tone(120 * up, 0.18, { to: 48, vol: 0.38, attack: 0.002 })
      this.noise(0.06, { filter: 'highpass', f: 1800, vol: 0.12, attack: 0.002 })
      this.noise(0.32, { filter: 'lowpass', f: 2200 * up, to: 220, q: 2, vol: 0.32, attack: 0.004, delay: 0.01 })
      this.noise(0.26, { f: 1300 * up, to: 500, q: 2.5, vol: 0.14, attack: 0.02, delay: 0.05 })
    } else if (kind === 'mela') {
      this.noise(0.07, { f: 4200 * up, to: 1800 * up, q: 1, vol: 0.14, attack: 0.003 })
      ;[0, 0.012, 0.026, 0.045].forEach((d, i) => this.noise(0.035, { f: (2600 - i * 300) * up, q: 3, vol: 0.2 - i * 0.035, attack: 0.001, delay: 0.02 + d }))
      this.noise(0.12, { filter: 'lowpass', f: 1200 * up, to: 300, q: 3, vol: 0.14, attack: 0.004, delay: 0.03 })
      this.tone(210 * up, 0.07, { to: 110, vol: 0.12, attack: 0.002 })
    } else if (kind === 'morbido') {
      this.noise(0.2, { filter: 'lowpass', f: 900 * up, to: 160, q: 3, vol: 0.32, attack: 0.008 })
      this.tone(95 * up, 0.16, { to: 55, vol: 0.26, attack: 0.004 })
      this.noise(0.08, { f: 1400 * up, to: 700, q: 2, vol: 0.06, attack: 0.004 })
    }
  }
}

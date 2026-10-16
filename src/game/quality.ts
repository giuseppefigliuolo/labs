/**
 * Render quality. The starting tier is a guess from the device; the engine
 * then steps it down at runtime (see `Quality.sample`) if frames run slow.
 * Force a tier with `?q=high` or `?q=low` in the URL.
 */
export type QualityState = {
  /** WebGL and 2D canvas pixel ratio. */
  dpr: number
  /** MSAA samples of the post-processing scene target. */
  msaa: number
  /** Bloom + chromatic aberration. Off means the scene is drawn straight to the canvas. */
  post: boolean
  /** Canvas2D shadowBlur glow on the blade trail (expensive), otherwise faked with wide strokes. */
  glow: boolean
  /** Sphere tessellation, fixed at startup. */
  seg: number
  /** Low-end device: also drops CSS backdrop blurs (see `.labs--lite`). */
  lite: boolean
}

function lowEnd() {
  const forced = new URLSearchParams(location.search).get('q')
  if (forced === 'low' || forced === 'high') return forced === 'low'
  const n = navigator as Navigator & { deviceMemory?: number }
  return (n.hardwareConcurrency || 4) <= 4 || (n.deviceMemory ?? 8) <= 4
}

const SLOW_MS = 21 // average frame time that triggers a downgrade (~48 fps)
const WINDOW_MS = 1500

export class Quality {
  readonly s: QualityState
  private minDpr: number
  private acc = 0
  private n = 0
  private settle = WINDOW_MS

  constructor() {
    const lite = lowEnd(), dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2)
    this.minDpr = Math.min(dpr, 1)
    this.s = { dpr, msaa: lite ? 0 : 4, post: true, glow: !lite, seg: lite ? 40 : 64, lite }
  }

  /**
   * Feeds one frame time (ms). Returns true when quality was just lowered and
   * the renderer needs to be reconfigured.
   */
  sample(ms: number) {
    if (document.hidden || ms > 250) return false // tab switches, debugger pauses
    if (this.settle > 0) { this.settle -= ms; return false }
    this.acc += ms; this.n++
    if (this.acc < WINDOW_MS) return false
    const avg = this.acc / this.n
    this.acc = 0; this.n = 0
    return avg > SLOW_MS && this.lower()
  }

  private lower() {
    const s = this.s
    if (s.glow) s.glow = false
    else if (s.msaa) s.msaa = 0
    else if (s.dpr > this.minDpr) s.dpr = Math.max(this.minDpr, s.dpr - 0.25)
    else if (s.post) s.post = false
    else return false
    this.settle = WINDOW_MS // ignore the hitch caused by the change itself
    return true
  }
}

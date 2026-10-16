import { bitrockPng } from '../data/projects'

const canvas = (w: number, h = w) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

export const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = src
  })

/** Downscales an image so its longest side is at most `max` px (logos are drawn far smaller than their source). */
export function fitImage(img: HTMLImageElement, max = 1024): HTMLImageElement | HTMLCanvasElement {
  const k = max / Math.max(img.width, img.height)
  if (k >= 1) return img
  const [c, g] = canvas(Math.round(img.width * k), Math.round(img.height * k))
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, 0, 0, c.width, c.height)
  return c
}

/** Soft white radial falloff, used for glows, sparks and dust. */
export function radialCanvas() {
  const [c, g] = canvas(128)
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return c
}

/** Lowercase Nunito wordmark followed by an accent dot. */
export function wordmark(text: string, accent: string, size = 150) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d')!
  const f = `900 ${size}px Nunito`; ctx.font = f; ctx.letterSpacing = '-4px'
  const w = ctx.measureText(text).width, dot = size * 0.12
  c.width = Math.ceil(w + dot * 3 + size * 0.5); c.height = Math.ceil(size * 1.4)
  ctx.font = f; ctx.letterSpacing = '-4px'
  const base = c.height * 0.7
  ctx.shadowColor = 'rgba(7,31,54,.5)'; ctx.shadowBlur = size * 0.12; ctx.fillStyle = '#ffffff'
  ctx.fillText(text, size * 0.2, base)
  ctx.shadowBlur = 0; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(size * 0.2 + w + dot * 1.5, base - dot, dot, 0, Math.PI * 2); ctx.fill()
  return c
}

/** Glowing red bug icon (lucide "bug" paths). */
export function bugCanvas() {
  const [c, ctx] = canvas(256)
  ctx.scale(256 / 28, 256 / 28); ctx.translate(2, 2)
  ctx.strokeStyle = '#ff5a72'; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(255,59,92,.9)'; ctx.shadowBlur = 3
  ;['m8 2 1.88 1.88', 'M14.12 3.88 16 2', 'M9 7.13v-1a3.003 3.003 0 1 1 6 0v1', 'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6', 'M12 20v-9', 'M6.53 9C4.6 8.8 3 7.1 3 5', 'M6 13H2', 'M3 21c0-2.1 1.7-3.9 3.8-4', 'M20.97 5c0 2.1-1.6 3.8-3.5 4', 'M22 13h-4', 'M17.2 17c2.1.1 3.8 1.9 3.8 4'].forEach(d => ctx.stroke(new Path2D(d)))
  return c
}

/** Bitrock mark (cropped from the horizontal logo) stacked over a BIT/ROCK wordmark. */
export async function bitrockCanvas() {
  const img = await loadImg(bitrockPng)
  const [c, ctx] = canvas(640, 540)
  const sw = 870, sh = 848, dh = 300, dw = dh * sw / sh
  ctx.drawImage(img, 0, 0, sw, sh, (640 - dw) / 2, 10, dw, dh)
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '4px'
  ctx.font = '800 92px Nunito'; const w1 = ctx.measureText('BIT').width
  ctx.font = '300 92px Nunito'; const w2 = ctx.measureText('ROCK').width
  const x0 = (640 - w1 - w2) / 2
  ctx.font = '800 92px Nunito'; ctx.fillText('BIT', x0, 460)
  ctx.font = '300 92px Nunito'; ctx.fillText('ROCK', x0 + w1, 460)
  return c
}

const fnv = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

/** Fruit variant (0..6) a tint/key pair maps to, stable per project; -1 is the bug interior. */
export const fleshVariant = (tint: string, key?: string) =>
  tint === 'dark' ? -1 : fnv(String(key ?? tint)) % 7

/**
 * "Fruit flesh" texture for the cut face of a sliced bubble.
 * `tint === 'dark'` is the bug interior; otherwise the key picks a fruit style.
 */
export function fleshCanvas(tint: string, key?: string) {
  const dark = tint === 'dark'
  const h = fnv(String(key ?? tint))
  const variant = fleshVariant(tint, key)
  let s = h || 1
  const rnd = () => (s = Math.imul(s ^ (s >>> 15), 1 | s) + 0x6D2B79F5 >>> 0, ((s ^ (s >>> 14)) >>> 0) / 4294967296)
  const [c, x] = canvas(256)
  const C = 128, TAU = Math.PI * 2
  const disc = (r: number, fill: string | CanvasGradient) => { x.fillStyle = fill; x.beginPath(); x.arc(C, C, r, 0, TAU); x.fill() }
  const seed = (px: number, py: number, rx: number, ry: number, a: number, col: string) => { x.fillStyle = col; x.beginPath(); x.ellipse(px, py, rx, ry, a, 0, TAU); x.fill() }
  const g = x.createRadialGradient(C, C, 8, C, C, 128)
  if (dark) {
    g.addColorStop(0, '#ffb000'); g.addColorStop(0.3, '#ff3b30'); g.addColorStop(0.7, '#2a0806'); g.addColorStop(1, '#12040a'); disc(128, g)
  } else if (variant === 0) { // classic seed ring
    g.addColorStop(0, 'rgba(255,250,240,1)'); g.addColorStop(0.28, tint); g.addColorStop(0.84, tint); g.addColorStop(0.9, 'rgba(255,245,230,1)'); g.addColorStop(1, 'rgba(255,245,230,.75)'); disc(128, g)
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, r = 60; seed(C + Math.cos(a) * r, C + Math.sin(a) * r, 4, 9, a, 'rgba(26,13,5,.6)') }
  } else if (variant === 1) { // citrus segments
    disc(128, 'rgba(255,245,230,.85)'); disc(116, '#fffaf0')
    const n = 9 + Math.floor(rnd() * 4)
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU + 0.05, a1 = (i + 1) / n * TAU - 0.05
      const sg = x.createRadialGradient(C, C, 10, C, C, 110); sg.addColorStop(0, 'rgba(255,255,255,.9)'); sg.addColorStop(0.35, tint); sg.addColorStop(1, tint)
      x.fillStyle = sg; x.beginPath(); x.moveTo(C + Math.cos((a0 + a1) / 2) * 12, C + Math.sin((a0 + a1) / 2) * 12); x.arc(C, C, 106, a0, a1); x.closePath(); x.fill()
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.5
      for (let k = 0; k < 4; k++) { const a = a0 + (a1 - a0) * (0.2 + rnd() * 0.6), r0 = 30 + rnd() * 30; x.beginPath(); x.moveTo(C + Math.cos(a) * r0, C + Math.sin(a) * r0); x.lineTo(C + Math.cos(a) * (r0 + 18 + rnd() * 20), C + Math.sin(a) * (r0 + 18 + rnd() * 20)); x.stroke() }
    }
    disc(9, '#fffaf0')
  } else if (variant === 2) { // kiwi: pale core, dense seed halo
    g.addColorStop(0, 'rgba(255,252,235,1)'); g.addColorStop(0.22, 'rgba(255,252,235,1)'); g.addColorStop(0.36, tint); g.addColorStop(0.92, tint); g.addColorStop(1, 'rgba(60,40,20,.8)'); disc(128, g)
    for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = 38 + rnd() * 22; seed(C + Math.cos(a) * r, C + Math.sin(a) * r, 1.8, 4.5, a, 'rgba(20,10,4,.85)') }
    x.strokeStyle = 'rgba(255,252,235,.35)'; x.lineWidth = 1
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; x.beginPath(); x.moveTo(C + Math.cos(a) * 30, C + Math.sin(a) * 30); x.lineTo(C + Math.cos(a) * 112, C + Math.sin(a) * 112); x.stroke() }
  } else if (variant === 3) { // watermelon: thick rind, scattered seeds
    disc(128, 'rgba(20,40,30,.9)'); disc(118, 'rgba(255,250,235,1)'); disc(108, tint)
    const wg = x.createRadialGradient(C, C, 0, C, C, 108); wg.addColorStop(0, 'rgba(255,255,255,.25)'); wg.addColorStop(1, 'rgba(255,255,255,0)'); disc(108, wg)
    for (let i = 0; i < 16; i++) { const a = rnd() * TAU, r = 25 + rnd() * 60; seed(C + Math.cos(a) * r, C + Math.sin(a) * r, 3.5, 7, a + Math.PI / 2, 'rgba(18,8,4,.85)') }
  } else if (variant === 4) { // stone fruit: big pit
    g.addColorStop(0, tint); g.addColorStop(0.85, tint); g.addColorStop(0.93, 'rgba(255,240,220,1)'); g.addColorStop(1, 'rgba(255,240,220,.7)'); disc(128, g)
    const ox = C + (rnd() - 0.5) * 8, oy = C + (rnd() - 0.5) * 8
    const fg = x.createRadialGradient(ox, oy, 30, ox, oy, 70); fg.addColorStop(0, 'rgba(255,255,255,.35)'); fg.addColorStop(1, 'rgba(255,255,255,0)'); disc(128, fg)
    const pg = x.createRadialGradient(ox - 10, oy - 10, 4, ox, oy, 42); pg.addColorStop(0, '#a8703c'); pg.addColorStop(1, '#4a2a12')
    x.fillStyle = pg; x.beginPath(); x.ellipse(ox, oy, 34, 40, rnd() * TAU, 0, TAU); x.fill()
  } else if (variant === 5) { // pomegranate: warm red rind, cream pith tinted by the project, glossy arils
    disc(128, '#b8402a'); disc(120, '#f6dcb4')
    x.globalAlpha = 0.45; disc(120, tint); x.globalAlpha = 1
    const glow = x.createRadialGradient(C, C, 0, C, C, 120); glow.addColorStop(0, 'rgba(255,245,225,.55)'); glow.addColorStop(0.5, 'rgba(255,245,225,.15)'); glow.addColorStop(1, 'rgba(255,245,225,0)'); disc(120, glow)
    x.strokeStyle = 'rgba(255,240,210,.85)'; x.lineWidth = 3; x.lineCap = 'round'
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + rnd() * 0.3; x.beginPath(); x.moveTo(C, C); x.quadraticCurveTo(C + Math.cos(a + 0.3) * 60, C + Math.sin(a + 0.3) * 60, C + Math.cos(a) * 118, C + Math.sin(a) * 118); x.stroke() }
    const pts: [number, number][] = []
    for (let k = 0; k < 600 && pts.length < 75; k++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 104, px = C + Math.cos(a) * r, py = C + Math.sin(a) * r; if (pts.every(p => (p[0] - px) ** 2 + (p[1] - py) ** 2 > 196)) pts.push([px, py]) }
    for (const [px, py] of pts) {
      const r = 7 + rnd() * 2
      x.fillStyle = 'rgba(150,24,12,.3)'; x.beginPath(); x.arc(px + 1, py + 1.5, r + 1, 0, TAU); x.fill()
      const ag = x.createRadialGradient(px - r * 0.35, py - r * 0.35, 0, px, py, r); ag.addColorStop(0, '#ffd9d4'); ag.addColorStop(0.55, tint); ag.addColorStop(1, tint)
      x.fillStyle = ag; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill()
      x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.ellipse(px - r * 0.32, py - r * 0.38, r * 0.34, r * 0.2, -0.6, 0, TAU); x.fill()
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.arc(px + r * 0.38, py + r * 0.3, r * 0.12, 0, TAU); x.fill()
    }
  } else { // dragon fruit: pale flesh, speckles, coloured skin
    disc(128, tint); disc(116, 'rgba(255,252,248,1)')
    const dg = x.createRadialGradient(C, C, 0, C, C, 116); dg.addColorStop(0, 'rgba(255,255,255,0)'); dg.addColorStop(1, tint); x.globalAlpha = 0.25; disc(116, dg); x.globalAlpha = 1
    for (let i = 0; i < 220; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 108; x.fillStyle = 'rgba(15,10,8,.85)'; x.beginPath(); x.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 1.2 + rnd() * 1.4, 0, TAU); x.fill() }
  }
  return c
}

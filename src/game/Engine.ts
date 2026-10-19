import * as THREE from 'three'
import { CONFIG } from '../config'
import { BITROCK, PROJECTS, type Project } from '../data/projects'
import { cfg, saveBest, saveMuted, saveUnlocked, useUI, type PopAnim, type UIState } from '../store'
import { Sfx } from './audio'
import { buildBands, makeEnv, type Band } from './logo3d'
import { PostFX } from './post'
import { Quality } from './quality'
import { HALF_F, HALF_V, LOGO_F, LOGO_V, SHELL_F, SHELL_V } from './shaders'
import { bugCanvas, fitImage, fleshCanvas, fleshVariant, loadImg, radialCanvas, wordmark } from './textures'

type EaseFn = (p: number) => number
const ease = {
  outCubic: (p: number) => 1 - Math.pow(1 - p, 3),
  inCubic: (p: number) => p * p * p,
  inOutCubic: (p: number) => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  inOutQuart: (p: number) => p < .5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2,
  outExpo: (p: number) => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
  lin: (p: number) => p
}

type Mode = 'loading' | 'intro' | 'starting' | 'play' | 'paused' | 'focus' | 'over' | 'complete' | 'frenzy'
type ItemType = 'project' | 'bitrock' | 'bug' | 'start'
type Tween = { e: number; dur: number; ease: EaseFn; fn: ((p: number) => void) | null; done?: () => void }
type Pt = { x: number; y: number; t: number; lv?: number }
type Dir = { x: number; y: number }
type Tex = { tex: THREE.Texture; geo: THREE.PlaneGeometry }

type Item = {
  type: ItemType; data: Project | null; key: string; tint: string; danger: boolean
  g: THREE.Group; shell: THREE.Group; logo: THREE.Object3D; spark: THREE.Mesh | null; ring?: THREE.Group
  r: number; pos: THREE.Vector3; vel: THREE.Vector3; spin: THREE.Vector3; ph: number; alive: boolean
  float?: boolean; baseY: number
  /** The 3D Bitrock logo ("frutto"): cut radius in world units and its halo. */
  fruit?: boolean; cut?: number; halo?: THREE.Sprite
}
/** Raffica: the sliced logo hangs in the middle and every blade pass on it is worth a point. */
type Frenzy = { it: Item; t: number; dur: number; hits: number; open: number; punch: number; base: number; wob: THREE.Vector3; kick: THREE.Vector3[]; inside: boolean
  /**
   * Current leg of the blade over the logo: where it started (last hit or touch down), px travelled since,
   * and its direction once measurable. Turning back from it counts as a new pass.
   */
  from: { x: number; y: number } | null; travel: number; dir: Dir | null }
/** Sparks, blade marks, the logo's flying bands and its fading halo. Bands follow the game clock, the rest real time. */
type Part = { o: THREE.Object3D; kind: 'spark' | 'mark' | 'band' | 'halo'; vel: THREE.Vector3; w?: THREE.Vector3; g: number; drag: number; life: number; max: number; s0: THREE.Vector3 }
type Half = { g: THREE.Group; vel: THREE.Vector3; axis: THREE.Vector3; tumble: number; spinZ: number; ringMat: THREE.MeshBasicMaterial; age: number; pos: THREE.Vector3; l1?: boolean; dead?: boolean }
type Stain = { c: HTMLCanvasElement; x: number; y: number; life: number }
type Drop = { x: number; y: number; vx: number; vy: number; r: number; col: string; life: number }
type Confetto = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; col: string; ph: number }
type Wave = { x: number; y: number; t: number; col: string }

const ui = () => useUI.getState()
const set = (patch: Partial<UIState>) => useUI.setState(patch)

/**
 * The whole game: three.js scene, physics, slicing, camera choreography,
 * 2D FX canvases and input. React only renders the overlays and reads/writes
 * the shared `useUI` store.
 */
export class Engine {
  private root: HTMLElement
  private mount: HTMLElement
  private dead = false
  private raf = 0
  private timeouts = new Set<number>()

  // three
  private renderer?: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private post: PostFX | null = null
  private camZ = 12
  private fov = 45
  private camHome!: THREE.Vector3
  private camBase!: THREE.Vector3
  private camLook!: THREE.Vector3
  private uTime = { value: 0 }
  private sphereGeo!: THREE.SphereGeometry
  private hemiGeo!: THREE.SphereGeometry
  private ringGeo!: THREE.TorusGeometry
  private glowGeo!: THREE.PlaneGeometry
  private discGeo!: THREE.CircleGeometry
  private arcGeo!: THREE.TorusGeometry
  private capGeo!: THREE.CircleGeometry
  private radialTex!: THREE.CanvasTexture
  private bands: Band[] = []
  private planeGeo!: THREE.PlaneGeometry
  private fleshTex: Record<string, THREE.CanvasTexture> = {}
  private tex: Record<string, Tex> = {}
  private dust!: THREE.Points
  private Z = new THREE.Vector3(0, 0, 1)
  private v = new THREE.Vector3()
  private fv = new THREE.Vector3()
  private quality = new Quality()
  // Materials shared by every bubble/half of the same look. They are never
  // disposed mid-game: disposing the last user of a shader makes three delete
  // the GPU program, and the next slice would recompile it (a visible hitch).
  private mats = new Map<string, THREE.Material>()
  // One instance of each per-half material, compiled at startup and kept alive
  // for the same reason.
  private keep: THREE.Material[] = []

  // 2D canvases: stains under the scene, trail/drops/confetti over it
  private scan?: HTMLCanvasElement
  private sctx!: CanvasRenderingContext2D
  private tcan?: HTMLCanvasElement
  private tctx!: CanvasRenderingContext2D
  /** Pixel ratio the 2D canvases were last sized with (their base transform). */
  private fxDpr = 1
  /** Canvases of faded stains, reused by the next slices. */
  private stainPool: HTMLCanvasElement[] = []
  /** Sparks and blade marks of finished effects, reused with their materials: the frenzy makes dozens a second. */
  private sparkPool: THREE.Sprite[] = []
  private markPool: THREE.Mesh[] = []

  // viewport
  private rootX = 0
  private rootY = 0
  private W = 0
  private H = 0
  private viewW = 0
  private viewH = 0
  private r = 1
  private g = 1

  // game state
  private mode: Mode = 'loading'
  private prevMode: Mode = 'play'
  private setPrev: Mode = 'play'
  private items: Item[] = []
  private halves: Half[] = []
  private frenzy: Frenzy | null = null
  private parts: Part[] = []
  private hud: Partial<Record<'fill' | 'num' | 'fx', HTMLElement>> = {}
  private queue: { t: number; type: ItemType; data?: Project }[] = []
  private score = 0
  private lives = 3
  private found: string[] = []
  private bitrockSeen = false
  private allDone = false
  private allPending = false
  private focusPending = false
  private closing = false
  private spawnTimer = 0
  private spawnCount = 0
  private timeScale = 1
  private tw = new Map<string, Tween>()
  private tid = 0
  private fx = { fov: 45, roll: 0, blur: 0 }
  private blurNow = 0
  private shakeAmt = 0
  private caPulse = 0
  private bloomPulse = 0
  private par = { x: 0, y: 0, tx: 0, ty: 0 }
  private popSide = 1
  private last = 0

  // effects
  private trail: Pt[] = []
  private stains: Stain[] = []
  private drops: Drop[] = []
  private misses: { x: number; t: number }[] = []
  private waves: Wave[] = []
  private confetti: Confetto[] = []

  // input
  private ptrDown = false
  private lastPt: Pt | null = null
  private strokeHits = 0
  private lastSwoosh = 0
  private lastDir: Dir | null = null
  private sDirty = false
  private tDirty = false
  private frameNo = 0
  /** Resizing clears every canvas: draw the next frame even if the scene is still. */
  private redraw = true
  /** Popup logos, decoded ahead of time and kept referenced so the browser keeps them decoded. */
  private logos: HTMLImageElement[] = []

  private sfx = new Sfx(() => CONFIG.sound && !ui().muted, CONFIG.sliceSound)

  constructor(root: HTMLElement, mount: HTMLElement) {
    this.root = root
    this.mount = mount
  }

  start() {
    this.init().catch(e => console.error(e))
  }

  dispose() {
    this.dead = true
    cancelAnimationFrame(this.raf)
    this.timeouts.forEach(clearTimeout)
    window.removeEventListener('resize', this.onResize)
    this.root.removeEventListener('pointerdown', this.onDown)
    this.root.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onBlur)
    this.post?.dispose()
    this.scene?.environment?.dispose(); this.bands.forEach(b => b.geo.dispose())
    this.mats.forEach(m => m.dispose()); this.keep.forEach(m => m.dispose())
    this.sparkPool.forEach(s => s.material.dispose()); this.markPool.forEach(m => (m.material as THREE.Material).dispose())
    if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove() }
    this.scan?.remove()
    this.tcan?.remove()
    this.sfx.close()
  }

  private timeout(fn: () => void, ms: number) {
    const id = window.setTimeout(() => { this.timeouts.delete(id); fn() }, ms)
    this.timeouts.add(id)
    return id
  }

  private clearTimeout(id?: number) {
    if (id === undefined) return
    window.clearTimeout(id)
    this.timeouts.delete(id)
  }

  // ---------- setup ----------
  private async init() {
    THREE.ColorManagement.enabled = false
    try { await Promise.all([document.fonts.load('800 120px Nunito'), document.fonts.load('300 120px Nunito'), document.fonts.load('900 120px Nunito')]) } catch { /* fall back to system font */ }
    if (this.dead) return

    const q = this.quality.s
    if (q.lite) this.root.classList.add('labs--lite')
    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(q.dpr)
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    const fill = { position: 'absolute', inset: '0', width: '100%', height: '100%' }
    Object.assign(renderer.domElement.style, fill)
    const scan = this.scan = document.createElement('canvas')
    Object.assign(scan.style, fill, { pointerEvents: 'none' })
    this.mount.appendChild(scan); this.sctx = scan.getContext('2d')!
    this.mount.appendChild(renderer.domElement)
    const tcan = this.tcan = document.createElement('canvas')
    Object.assign(tcan.style, fill, { pointerEvents: 'none' })
    this.mount.appendChild(tcan)
    this.tctx = tcan.getContext('2d')!

    this.scene = new THREE.Scene()
    this.bands = buildBands()
    // reflections and the two lights only reach PBR materials (the logo): bubbles and shaders are unlit
    this.scene.environment = makeEnv(renderer)
    const key = new THREE.DirectionalLight('#fff4e6', 1.6); key.position.set(3, 4, 5)
    const rim = new THREE.DirectionalLight('#ff8a3a', 1.4); rim.position.set(-4, 2, -3)
    // the output is linear (no sRGB encoding): a strong ambient keeps the bands orange whichever way they face
    this.scene.add(key, rim, new THREE.AmbientLight('#ffffff', 1.2))
    this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 100)
    this.camHome = new THREE.Vector3(0, 0, this.camZ)
    this.camBase = this.camHome.clone(); this.camLook = new THREE.Vector3()
    const seg = q.seg
    this.sphereGeo = new THREE.SphereGeometry(1, seg, seg * 3 / 4)
    this.hemiGeo = new THREE.SphereGeometry(1, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2)
    this.ringGeo = new THREE.TorusGeometry(1, 0.012, 6, 96)
    this.glowGeo = new THREE.PlaneGeometry(2.6, 2.6)
    this.discGeo = new THREE.CircleGeometry(0.97, 48)
    this.arcGeo = new THREE.TorusGeometry(1.5, 0.035, 8, 40, Math.PI / 3)
    this.capGeo = new THREE.CircleGeometry(1.0, seg)
    this.radialTex = new THREE.CanvasTexture(radialCanvas())
    this.planeGeo = new THREE.PlaneGeometry(1, 1)
    try { this.post = new PostFX(q.msaa) } catch (e) { console.warn(e); this.post = null }

    await this.buildTextures()
    if (this.dead) return
    this.buildDust()

    window.addEventListener('resize', this.onResize)
    this.resize()
    if (CONFIG.sound) this.sfx.prepare()
    await this.warmUp()
    if (this.dead) return
    this.preloadLogos()
    this.root.addEventListener('pointerdown', this.onDown)
    this.root.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp); window.addEventListener('pointercancel', this.onUp)
    window.addEventListener('blur', this.onBlur); document.addEventListener('visibilitychange', this.onBlur)

    this.toIntro()
    this.last = performance.now()
    const loop = (t: number) => { if (this.dead) return; this.frame(t); this.raf = requestAnimationFrame(loop) }
    this.raf = requestAnimationFrame(loop)
  }

  private async buildTextures() {
    const add = (key: string, src: HTMLCanvasElement | HTMLImageElement, maxW = 1.5, maxH = 0.95) => {
      const tex = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src)
      tex.needsUpdate = true; tex.anisotropy = 4
      const aspect = src.width / src.height
      let w = maxW, h = w / aspect; if (h > maxH) { h = maxH; w = h * aspect }
      this.tex[key] = { tex, geo: new THREE.PlaneGeometry(w, h) }
    }
    for (const p of PROJECTS) {
      if (p.texSrc) add(p.id, fitImage(await loadImg(p.texSrc)))
      else add(p.id, wordmark(p.word!, p.accent!))
    }
    add('bug', bugCanvas(), 1.0, 1.0)
    add('start', wordmark('gioca', '#ff9a00'), 1.7)
  }

  /**
   * The popup shows its logo as a CSS background, which would otherwise be fetched and decoded
   * the first time that popup opens, in the middle of the zoom. Not awaited: no popup opens this early.
   */
  private preloadLogos() {
    for (const p of [...PROJECTS, BITROCK]) {
      if (p.logo) loadImg(p.logo).then(i => { this.logos.push(i); return i.decode() }).catch(() => { /* the popup loads it itself */ })
    }
  }

  private buildDust() {
    const n = 140, pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 40; pos[i * 3 + 1] = (Math.random() - .5) * 24; pos[i * 3 + 2] = -3 - Math.random() * 14 }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, map: this.radialTex, color: new THREE.Color('#ff8a3d'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.scene.add(this.dust)
  }

  private onResize = () => this.resize()

  private resize() {
    const renderer = this.renderer!
    const W = this.W = this.mount.clientWidth, H = this.H = this.mount.clientHeight
    renderer.setSize(W, H, false)
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix()
    this.viewH = 2 * this.camZ * Math.tan(this.fov * Math.PI / 360)
    this.viewW = this.viewH * this.camera.aspect
    const touch = !!window.matchMedia?.('(pointer: coarse)').matches, portrait = innerHeight > innerWidth
    // bigger bubbles on a phone held sideways (Fruit Ninja style); on narrow screens the width caps them at ~1/5 of it
    this.r = Math.min(this.viewW * 0.105, this.viewH * (touch && !portrait ? 0.11 : 0.09))
    this.syncDevice(touch, portrait)
    this.g = this.viewH * 1.0
    const rr = this.root.getBoundingClientRect(); this.rootX = rr.left; this.rootY = rr.top
    const dpr = this.quality.s.dpr
    this.fxDpr = dpr
    this.tcan!.width = W * dpr; this.tcan!.height = H * dpr; this.tctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.scan!.width = W * dpr; this.scan!.height = H * dpr; this.sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.items.forEach(it => { if (it.float) { this.fitIntro(it); it.g.scale.setScalar(it.r) } })
    this.post?.setSize(W, H, renderer.getPixelRatio())
    this.sDirty = this.tDirty = this.redraw = true
  }

  /**
   * Publishes touch/portrait to the UI and closes "Ruota il telefono" once the
   * viewport has the orientation it asked for.
   * The intro's layout depends on both (and on the CSS short-screen query), so the
   * "gioca" bubble is refitted after React has committed the new layout.
   */
  private syncDevice(touch: boolean, portrait: boolean) {
    const s = ui(), rotateHint = s.rotateHint && portrait === (s.rotateTo === 'landscape')
    if (touch === s.touch && portrait === s.portrait && rotateHint === s.rotateHint) return
    set({ touch, portrait, rotateHint })
    requestAnimationFrame(() => requestAnimationFrame(() => this.items.forEach(it => { if (it.alive && it.float) { this.fitIntro(it); it.g.scale.setScalar(it.r) } })))
  }

  /** Applies a quality step chosen by `Quality.sample`. */
  private applyQuality() {
    const q = this.quality.s
    this.post?.setSamples(q.msaa)
    if (this.renderer!.getPixelRatio() !== q.dpr) { this.renderer!.setPixelRatio(q.dpr); this.resize() }
  }

  /**
   * Uploads every texture and compiles every shader the game can use before
   * the intro shows, by building (and slicing) one bubble of each kind
   * offscreen. Otherwise each first-time spawn or slice stalls a frame or two.
   */
  private async warmUp() {
    const r = this.renderer!
    for (const p of PROJECTS) this.flesh(p.tint, p.id)
    this.flesh('dark', 'bug')
    for (const t of [this.radialTex, ...Object.values(this.fleshTex), ...Object.values(this.tex).map(t => t.tex)]) r.initTexture(t)
    const its = [this.makeItem('project', PROJECTS[0]), this.makeItem('bug', null)]
    for (const it of its) { it.pos.set(0, 0, 0); this.slice(it, { x: 1, y: 0 }) }
    // the logo is never sliced: it only needs its PBR programs, a spark and a blade mark compiled (and kept alive)
    const fruit = this.makeItem('bitrock', BITROCK)
    const sparkMat = new THREE.SpriteMaterial({ map: this.radialTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const markMat = new THREE.MeshBasicMaterial({ map: this.radialTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    this.keep.push(sparkMat, markMat)
    const warm = [new THREE.Sprite(sparkMat), new THREE.Mesh(this.planeGeo, markMat)]
    this.scene.add(...warm)
    try { await r.compileAsync(this.scene, this.camera) } catch (e) { console.warn(e) }
    // drop the warm-up objects but keep their per-half materials referenced
    for (const h of this.halves) {
      h.g.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && !m.userData.shared) this.keep.push(m) })
      this.scene.remove(h.g)
    }
    this.halves = []; this.items = []; this.drops = []
    for (const st of this.stains) this.stainPool.push(st.c)
    this.stains = []
    this.removeItem(fruit); this.scene.remove(...warm)
    if (this.dead) return
    // first post-processing frame allocates the render targets and compiles the passes
    if (this.post) this.renderPost(); else r.render(this.scene, this.camera)
  }

  private renderPost() {
    const on = this.quality.s.post, bloom = on ? CONFIG.bloom : 0, ca = on ? CONFIG.aberration : 0
    for (const h of this.halves) if (!h.l1) { h.g.traverse(o => o.layers.set(1)); h.l1 = true }
    this.post!.render(this.renderer!, this.scene, this.camera, {
      bloom, ca,
      uBloom: bloom * (1 + this.bloomPulse * 1.4),
      uCA: ca * (0.004 + this.caPulse * 0.05),
      hasOverlay: this.halves.length > 0
    })
  }

  // ---------- public actions (wired to the UI) ----------
  openSettings = () => {
    const s = ui()
    if (s.settingsOpen || s.listOpen || s.popup || this.mode === 'focus' || this.mode === 'loading' || this.mode === 'frenzy') return
    this.setPrev = this.mode
    if (this.mode === 'play') { this.mode = 'paused'; this.tweenTime(0, 0.3, ease.outCubic) }
    set({ settingsOpen: true })
  }

  closeSettings = () => {
    if (!ui().settingsOpen) return
    set({ settingsOpen: false })
    if (this.setPrev === 'play' && this.mode === 'paused') { this.tweenTime(1, 0.6, ease.inCubic); this.after(0.3, () => { if (this.mode === 'paused') this.mode = 'play' }) }
  }

  /**
   * Projects bottom sheet: pauses the game like the settings panel. With `all` (top bar button,
   * once every project has been unlocked) it lists them all and opens from the other screens too.
   */
  openList = (all = false) => {
    const s = ui()
    const can = this.mode === 'play' || (all && s.unlockedAll && (this.mode === 'intro' || this.mode === 'over' || this.mode === 'complete'))
    if (!can || s.settingsOpen || s.listOpen || s.popup) return
    if (this.mode === 'play') { this.mode = 'paused'; this.tweenTime(0, 0.3, ease.outCubic) }
    set({ listOpen: true, listShown: false, listAll: all })
    requestAnimationFrame(() => requestAnimationFrame(() => { if (ui().listOpen) set({ listShown: true }) }))
  }

  closeList = () => {
    if (!ui().listShown) return
    this.hideList()
    if (this.mode === 'paused') { this.tweenTime(1, 0.6, ease.inCubic); this.after(0.3, () => { if (this.mode === 'paused') this.mode = 'play' }) }
  }

  /** A found project tapped in the sheet: its popup replaces the sheet and closing it goes back to where the sheet was opened. */
  openFromList = (data: Project, x: number, y: number) => {
    if (!ui().listShown || ui().popup) return
    this.hideList()
    this.prevMode = this.mode === 'paused' ? 'play' : this.mode
    if (this.prevMode === 'play') { this.mode = 'focus'; this.tweenTime(0.035, 0.4, ease.outCubic) }
    this.openPopup(data, x, y)
  }

  private hideList() {
    set({ listShown: false })
    this.timeout(() => set({ listOpen: false }), 450)
  }

  toggleMute = () => {
    const m = !ui().muted
    saveMuted(m)
    this.sfx.setMuted(m)
    set({ muted: m })
  }

  restart = () => { if (ui().popup) return; this.startGame() }

  continueGame = () => {
    if (!ui().complete) return
    set({ complete: false })
    this.tweenTime(1, 0.9, ease.inCubic)
    this.after(0.3, () => { if (this.mode === 'complete') this.mode = 'play' })
  }

  openFromUI = (data: Project, x: number, y: number) => {
    if (ui().popup || this.mode === 'focus' || this.mode === 'frenzy') return
    this.prevMode = this.mode
    if (this.mode === 'play') { this.mode = 'focus'; this.tweenTime(0.035, 0.4, ease.outCubic) }
    this.openPopup(data, x, y)
  }

  closePopup = () => {
    if (!ui().popup || this.closing) return
    this.closing = true
    set({ popupShown: false })
    this.timeout(() => { set({ popup: null }); this.closing = false }, ({ portal: 700, tilt: 560 } as Partial<Record<PopAnim, number>>)[ui().anim] || 480)
    if (ui().fresh) this.freshOff()
    if (this.backTo()) { this.mode = this.prevMode; return }
    const f0 = { ...this.fx }
    this.tween('fx', 0.95, ease.inOutQuart, p => { this.fx.fov = f0.fov + (this.fov - f0.fov) * p; this.fx.roll = f0.roll * (1 - p); this.fx.blur = f0.blur * (1 - p) })
    this.tweenCamera(this.camHome.clone(), new THREE.Vector3(), 0.95, ease.inOutQuart)
    if (this.allPending) { this.focusPending = false; this.finishAll(); return }
    this.tweenTime(1, 0.9, ease.inCubic)
    this.after(0.45, () => { this.mode = 'play'; this.focusPending = false })
  }

  /** Every project found: slow down and show the "complete" screen. */
  private finishAll() {
    this.allPending = false; this.mode = 'complete'
    this.tweenTime(0.12, 0.6, ease.outCubic); this.after(0.55, () => this.celebrate())
  }

  // ---------- options ----------
  private opt() {
    const d = cfg('difficulty')
    return {
      spawnMul: d === 'facile' ? 0.75 : d === 'difficile' ? 1.3 : 1,
      bugMul: d === 'facile' ? 0.7 : d === 'difficile' ? 1.4 : 1,
      bugs: CONFIG.bugs,
      always: CONFIG.popupMode === 'ogni taglio',
      popups: !cfg('soloGioco'),
      trail: CONFIG.trail
    }
  }

  private freshTO?: number
  /** The tray pill of the project just found shrinks back to its initial 2.8s from now. */
  private freshOff() {
    this.clearTimeout(this.freshTO); this.freshTO = this.timeout(() => set({ fresh: null }), 2800)
  }

  /** "+1" at the hit and the big "+N" at the end, as temporary elements of the frenzy layer. */
  private fxText(txt: string, x: number, y: number, big: boolean) {
    const fx = this.hudEl('fx'); if (!fx) return
    const d = document.createElement('div'); d.textContent = txt; d.className = 'fx-text ' + (big ? 'fx-total' : 'fx-plus')
    d.style.left = x + 'px'; d.style.top = y + 'px'
    fx.appendChild(d); this.timeout(() => d.remove(), big ? 1800 : 800)
  }

  private buzz(p: number | number[]) { try { if (navigator.vibrate) navigator.vibrate(p) } catch { /* unsupported */ } }

  private perfTO?: number
  private showPerfect(x: number, y: number) {
    x = Math.max(90, Math.min(this.W - 90, x)); y = Math.max(120, Math.min(this.H - 160, y))
    set({ perfOn: true, perfX: x + 'px', perfY: y + 'px' })
    this.clearTimeout(this.perfTO); this.perfTO = this.timeout(() => set({ perfOn: false }), 850)
  }

  private comboTO?: number
  private showCombo(n: number, x: number, y: number) {
    x = Math.max(90, Math.min(this.W - 90, x)); y = Math.max(140, Math.min(this.H - 140, y))
    set({ combo: 'Combo ×' + n, comboPts: '+' + n, comboX: x + 'px', comboY: y + 'px', comboOn: true })
    this.clearTimeout(this.comboTO); this.comboTO = this.timeout(() => set({ comboOn: false }), 900)
  }

  private celebrate() {
    this.score += 10
    set({ complete: true, score: this.score })
    this.sfx.play('complete'); this.buzz([20, 40, 20, 40, 60]); this.bloomPulse = 1.2
    const cols = PROJECTS.map(p => p.tint).concat(['#ffffff', '#fff4e6'])
    for (let i = 0; i < 160; i++) this.confetti.push({ x: Math.random() * this.W, y: -20 - Math.random() * this.H * 0.6, vx: (Math.random() - .5) * 120, vy: 120 + Math.random() * 220, rot: Math.random() * 6.28, vr: (Math.random() - .5) * 12, w: 6 + Math.random() * 8, h: 3 + Math.random() * 5, col: cols[i % cols.length], ph: Math.random() * 6.28 })
    this.waves.push({ x: this.W / 2, y: this.H / 2, t: performance.now(), col: '#ff9a00' })
  }

  // ---------- tweens ----------
  private tween(key: string | null, dur: number, e: EaseFn, fn: ((p: number) => void) | null, done?: () => void) {
    key = key || ('t' + (this.tid++)); this.tw.set(key, { e: 0, dur, ease: e, fn, done }); if (fn) fn(0)
  }
  private after(sec: number, fn: () => void) { this.tween(null, sec, ease.lin, null, fn) }
  private updateTweens(dt: number) {
    for (const [k, t] of this.tw) { t.e += dt; const p = Math.min(1, t.e / t.dur); if (t.fn) t.fn(t.ease(p)); if (p >= 1) { this.tw.delete(k); if (t.done) t.done() } }
  }
  private tweenTime(to: number, dur: number, e: EaseFn) { const from = this.timeScale; this.tween('time', dur, e, p => { this.timeScale = from + (to - from) * p }) }
  private tweenCamera(toPos: THREE.Vector3, toLook: THREE.Vector3, dur: number, e: EaseFn) {
    const fp = this.camBase.clone(), fl = this.camLook.clone()
    this.tween('cam', dur, e, p => { this.camBase.lerpVectors(fp, toPos, p); this.camLook.lerpVectors(fl, toLook, p) })
  }

  // ---------- objects ----------
  /** Cached material, shared by every object with the same look and kept until `dispose`. */
  private shared<M extends THREE.Material>(key: string, make: () => M): M {
    let m = this.mats.get(key) as M | undefined
    if (!m) { m = make(); m.userData.shared = true; this.mats.set(key, m) }
    return m
  }

  private basic(key: string, p: THREE.MeshBasicMaterialParameters) {
    return this.shared('basic|' + key, () => new THREE.MeshBasicMaterial(p))
  }

  private shellMat(tint: string, side: THREE.Side, alpha: number, danger: boolean) {
    return this.shared(`shell|${tint}|${side}|${alpha}|${danger}`, () => this.newShellMat(tint, side, alpha, danger))
  }

  private newShellMat(tint: string, side: THREE.Side, alpha: number, danger: boolean) {
    return new THREE.ShaderMaterial({ uniforms: { uTint: { value: new THREE.Color(tint) }, uTime: this.uTime, uAlpha: { value: alpha }, uDanger: { value: danger ? 1 : 0 } }, vertexShader: SHELL_V, fragmentShader: SHELL_F, transparent: true, depthWrite: false, side })
  }

  private logoMesh(key: string, side: number, n?: THREE.Vector3) {
    const info = this.tex[key]
    const make = () => new THREE.ShaderMaterial({ uniforms: { uMap: { value: info.tex }, uCut: { value: new THREE.Vector2(n ? n.x : 0, n ? n.y : 0) }, uSide: { value: side }, uOpacity: { value: 1 } }, vertexShader: LOGO_V, fragmentShader: LOGO_F, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    const m = new THREE.Mesh(info.geo, side ? make() : this.shared('logo|' + key, make)); m.renderOrder = 2; return m
  }

  private tintOf(type: ItemType, data: Project | null) { return type === 'bug' ? '#ff3b30' : type === 'start' ? '#ff6a00' : data!.tint }

  /** The 3D Bitrock logo that stands in for the "Chi siamo" bubble. */
  private makeFruit(data: Project | null) {
    const g = new THREE.Group(), band = new THREE.Group(), logo = new THREE.Object3D()
    // Satin rather than glossy, closer to the bubbles. The bands are drawn after the (transparent, non
    // depth-writing) bubbles: otherwise a bubble crossing the logo at the same depth gets cut through by it.
    for (const b of this.bands) {
      const m = new THREE.Mesh(b.geo, this.shared('band|' + b.color, () => new THREE.MeshPhysicalMaterial({ color: b.color, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.45, envMapIntensity: 0.55, transparent: true })))
      m.renderOrder = 10; band.add(m)
    }
    // halo as wide and faint as a bubble's glow (2.6 r)
    const s = this.r * 0.95
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.radialTex, color: new THREE.Color('#ff7a1a'), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }))
    halo.scale.setScalar(2.6 * this.r / s); halo.position.z = -0.8; halo.renderOrder = 1
    g.add(band, halo, logo)
    // the logo is about 2 units wide: at 0.95 r it is as big as a bubble
    g.scale.setScalar(s)
    // spins in the screen plane like the other fruits; the frame loop adds a gentle 3D sway (never edge-on)
    const sg = (a: number, b: number) => (Math.random() < 0.5 ? -1 : 1) * (a + Math.random() * (b - a))
    band.rotation.z = Math.random() * Math.PI * 2
    this.scene.add(g)
    const it: Item = { type: 'bitrock', data, key: 'bitrock', tint: '#ff7a1a', danger: false, g, shell: band, logo, spark: null, r: this.r, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(0, 0, sg(0.8, 1.6)), ph: Math.random() * 6, alive: true, baseY: 0, fruit: true, cut: 0.95 * this.r, halo }
    this.items.push(it)
    return it
  }

  private makeItem(type: ItemType, data: Project | null) {
    if (type === 'bitrock') return this.makeFruit(data)
    const g = new THREE.Group(), danger = type === 'bug'
    const tint = this.tintOf(type, data)
    const key = type === 'project' ? data!.id : type
    const shell = new THREE.Group()
    const back = new THREE.Mesh(this.sphereGeo, this.shellMat(tint, THREE.BackSide, danger ? 0.9 : 0.45, danger)); back.renderOrder = 0
    const front = new THREE.Mesh(this.sphereGeo, this.shellMat(tint, THREE.FrontSide, 1, danger)); front.renderOrder = 3
    shell.add(back, front)
    const glowA = danger ? 0.5 : 0.3
    const glow = new THREE.Mesh(this.glowGeo, this.basic(`glow|${tint}|${glowA}`, { map: this.radialTex, color: new THREE.Color(tint), transparent: true, opacity: glowA, depthWrite: false, blending: THREE.AdditiveBlending })); glow.renderOrder = 1
    const logo = this.logoMesh(key, 0)
    g.add(shell, glow, logo)
    let spark: THREE.Mesh | null = null
    if (!danger) { const body = new THREE.Mesh(this.sphereGeo, this.basic('body|' + tint, { color: new THREE.Color(tint).multiplyScalar(0.62), transparent: true, opacity: 0.82, depthWrite: false })); body.scale.setScalar(0.97); body.renderOrder = 0.5; g.add(body) }
    if (danger) {
      const core = new THREE.Mesh(this.sphereGeo, this.basic('core', { color: new THREE.Color('#12040a'), transparent: true, opacity: 0.85, depthWrite: false })); core.scale.setScalar(0.96); core.renderOrder = 0.5; g.add(core)
      spark = new THREE.Mesh(this.glowGeo, this.basic('spark', { map: this.radialTex, color: new THREE.Color('#ffb000'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); spark.scale.setScalar(0.25); spark.position.set(0.4, 0.95, 0.3); spark.renderOrder = 5; g.add(spark)
    }
    g.scale.setScalar(this.r)
    this.scene.add(g)
    const it: Item = { type, data, key, tint, danger, g, shell, logo, spark, r: this.r, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3((Math.random() - .5) * 1.2, (Math.random() - .5) * 1.6, (Math.random() - .5) * .8), ph: Math.random() * 6, alive: true, baseY: 0 }
    this.items.push(it)
    return it
  }

  private launch(it: Item) {
    const hw = this.viewW / 2, vh = this.viewH
    const x0 = (Math.random() * 2 - 1) * Math.max(0.1, hw * 0.75 - it.r)
    const h = vh * (0.6 + Math.random() * 0.24)
    const vy = Math.sqrt(2 * this.g * h)
    const t = vy / this.g
    const xt = (Math.random() - .5) * hw * 0.8
    it.pos.set(x0, -vh / 2 - it.r * 1.1, 0)
    it.vel.set((xt - x0) / t * 0.9, vy, 0)
    it.g.position.copy(it.pos)
  }

  private removeObj(g: THREE.Object3D) {
    g.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { if (!x.userData.shared) x.dispose() }) })
    this.scene.remove(g)
  }
  private removeItem(it: Item) { it.alive = false; this.removeObj(it.g) }

  private halfMat(it: Item, q: THREE.Quaternion, mode: number) {
    const info = this.tex[it.key]
    const rot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q))
    return new THREE.ShaderMaterial({ uniforms: { uTint: { value: new THREE.Color(it.tint) }, uMap: { value: info.tex }, uLogo: { value: new THREE.Vector2(info.geo.parameters.width, info.geo.parameters.height) }, uRot: { value: rot }, uMode: { value: mode }, uDanger: { value: it.danger ? 1 : 0 }, uTime: this.uTime }, vertexShader: HALF_V, fragmentShader: HALF_F })
  }

  private fleshId(tint: string, key?: string) { return tint + '|' + fleshVariant(tint, key) }

  private flesh(tint: string, key?: string) {
    return this.fleshTex[this.fleshId(tint, key)] ??= new THREE.CanvasTexture(fleshCanvas(tint, key))
  }

  private slice(it: Item, dir: Dir) {
    this.removeItem(it)
    this.splash(it, dir)
    const n = new THREE.Vector3(-dir.y, dir.x, 0).normalize()
    const Y = new THREE.Vector3(0, 1, 0)
    const mode = ({ solido: 0, lucido: 1, cartoon: 2 } as Record<string, number>)[CONFIG.sliceStyle]
    if (mode !== undefined) return this.sliceSolid(it, dir, n, Y, mode)
    // 'trasparente': hollow glass halves with the logo clipped along the cut
    for (const side of [1, -1]) {
      const hg = new THREE.Group(); hg.position.copy(it.pos); hg.scale.setScalar(it.r)
      const hemi = new THREE.Mesh(this.hemiGeo, this.shellMat(it.tint, THREE.DoubleSide, 1, it.danger)); hemi.renderOrder = 3
      hemi.quaternion.setFromUnitVectors(Y, n.clone().multiplyScalar(side))
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(it.danger ? '#ff5a72' : '#ffffff'), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })
      const ring = new THREE.Mesh(this.ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.renderOrder = 4; hemi.add(ring)
      const lh = this.logoMesh(it.key, side, n)
      const fk = it.danger ? 'dark' : it.tint
      const disc = new THREE.Mesh(this.discGeo, this.basic('disc|' + this.fleshId(fk, it.key), { map: this.flesh(fk, it.key), transparent: true, opacity: 0.94, depthWrite: false, side: THREE.DoubleSide })); disc.rotation.x = Math.PI / 2; disc.renderOrder = 2.5; hemi.add(disc)
      hg.add(hemi, lh)
      const axis = new THREE.Vector3(dir.x, dir.y, 0).normalize()
      hg.rotateOnWorldAxis(axis, -side * 0.6)
      if (it.danger) { const core = new THREE.Mesh(this.hemiGeo, this.basic('hcore', { color: new THREE.Color('#12040a'), transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })); core.quaternion.copy(hemi.quaternion); core.scale.setScalar(0.96); core.renderOrder = 0.5; hg.add(core) }
      this.scene.add(hg)
      const vel = it.vel.clone().multiplyScalar(0.35).add(n.clone().multiplyScalar(side * it.r * 2.4)).add(new THREE.Vector3(dir.x, dir.y, 0).multiplyScalar(it.r * 1.2))
      this.halves.push({ g: hg, vel, axis, tumble: -side * (1.2 + Math.random()), spinZ: side * (0.6 + Math.random() * 0.8), ringMat, age: 0, pos: hg.position })
    }
  }

  private sliceSolid(it: Item, dir: Dir, n: THREE.Vector3, Y: THREE.Vector3, mode: number) {
    const axis = new THREE.Vector3(dir.x, dir.y, 0).normalize()
    const front = Math.random() < 0.5 ? 1 : -1
    const spread = 1.4 + Math.random() * 1.2
    for (const side of [1, -1]) {
      const zs = side * front, push = it.r * 2.4 * spread * (0.8 + Math.random() * 0.4)
      const hg = new THREE.Group(); hg.position.copy(it.pos); hg.position.z += zs * it.r * 0.35; hg.scale.setScalar(it.r)
      const q = new THREE.Quaternion().setFromUnitVectors(Y, n.clone().multiplyScalar(side))
      const hemi = new THREE.Mesh(this.hemiGeo, this.halfMat(it, q, mode)); hemi.quaternion.copy(q)
      const fk = it.danger ? 'dark' : it.tint
      const cap = new THREE.Mesh(this.capGeo, this.basic('cap|' + this.fleshId(fk, it.key), { map: this.flesh(fk, it.key), side: THREE.DoubleSide })); cap.rotation.x = Math.PI / 2; hemi.add(cap)
      if (mode === 2) { const hull = new THREE.Mesh(this.hemiGeo, this.basic('hull', { color: new THREE.Color('#1a0d05'), side: THREE.BackSide })); hull.scale.setScalar(1.07); hemi.add(hull) }
      const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(it.danger ? '#ff5a72' : '#ffffff'), transparent: true, opacity: mode === 2 ? 0 : 1, depthWrite: false, blending: THREE.AdditiveBlending })
      const ring = new THREE.Mesh(this.ringGeo, ringMat); ring.rotation.x = Math.PI / 2; ring.renderOrder = 4; hemi.add(ring)
      hg.add(hemi)
      hg.rotateOnWorldAxis(axis, -side * 0.6)
      this.scene.add(hg)
      const vel = it.vel.clone().multiplyScalar(0.35).add(n.clone().multiplyScalar(side * push)).add(axis.clone().multiplyScalar(it.r * (0.8 + Math.random() * 0.9)))
      vel.z = zs * it.r * (0.8 + Math.random() * 0.6)
      this.halves.push({ g: hg, vel, axis, tumble: -side * (1.2 + Math.random()), spinZ: side * (0.6 + Math.random() * 0.8), ringMat, age: 0, pos: hg.position })
    }
  }

  /** Juice stain on the floor canvas plus a burst of drops. */
  private splash(it: Item, dir: Dir) {
    const c = this.toScreen(it.pos), sr = it.r * this.H / this.viewH
    const col = it.danger ? '#120806' : it.tint
    // canvas of a faded stain when there is one: creating a canvas and its context on the slice frame is not free on mobile
    const S = Math.ceil(sr * 5), oc = this.stainPool.pop() ?? document.createElement('canvas')
    if (oc.width !== S || oc.height !== S) { oc.width = oc.height = S }
    const x = oc.getContext('2d')!
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S, S)
    x.fillStyle = col; x.translate(S / 2, S / 2); x.globalAlpha = 0.5
    for (let k = 0; k < 6; k++) { x.beginPath(); x.arc((Math.random() - .5) * sr * .5, (Math.random() - .5) * sr * .5, sr * (0.3 + Math.random() * 0.3), 0, Math.PI * 2); x.fill() }
    const ang = Math.atan2(-dir.y, dir.x)
    for (const s of [1, -1]) { x.beginPath(); x.ellipse(Math.cos(ang) * sr * 0.9 * s, Math.sin(ang) * sr * 0.9 * s, sr * 0.8, sr * 0.11, ang, 0, Math.PI * 2); x.fill() }
    for (let k = 0; k < 16; k++) { const a = Math.random() * Math.PI * 2, d = sr * (0.8 + Math.random() * 1.3); x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, sr * (0.03 + Math.random() * 0.09), 0, Math.PI * 2); x.fill() }
    this.stains.push({ c: oc, x: c.x - S / 2, y: c.y - S / 2, life: 1 })
    if (this.stains.length > 14) this.stainPool.push(this.stains.shift()!.c)
    const n = it.danger ? 30 : 24
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, sp = sr * (2 + Math.random() * 5); this.drops.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - sr * 3, r: 2 + Math.random() * sr * 0.08, col: it.danger ? '#ffb000' : col, life: 1 }) }
  }

  // Both 2D canvases are only cleared when something was drawn on them last
  // frame: full-screen clears at high DPR are not free on mobile.
  private drawFx(dt: number, raw: number) {
    const s = this.sctx
    if (this.sDirty) { s.clearRect(0, 0, this.W, this.H); this.sDirty = false }
    if (this.stains.length) this.sDirty = true
    // stains fade on the game clock: in slow-mo behind a popup they hold still instead of repainting the canvas
    for (const st of this.stains) { st.life -= dt / 3.5; if (st.life > 0) { s.globalAlpha = Math.min(1, st.life * 1.6); s.drawImage(st.c, st.x, st.y) } }
    s.globalAlpha = 1
    const live = this.stains.filter(st => st.life > 0)
    if (live.length !== this.stains.length) for (const st of this.stains) if (st.life <= 0) this.stainPool.push(st.c)
    this.stains = live
    const t = this.tctx, gy = this.H * 1.8, glow = this.quality.s.glow
    if (this.drops.length || this.misses.length || this.waves.length || this.confetti.length) this.tDirty = true
    t.shadowBlur = 0
    for (const d of this.drops) { d.vy += gy * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt * 1.1; if (d.life > 0) { t.globalAlpha = d.life; t.fillStyle = d.col; t.beginPath(); t.arc(d.x, d.y, d.r * (0.5 + d.life * 0.5), 0, Math.PI * 2); t.fill() } }
    this.drops = this.drops.filter(d => d.life > 0 && d.y < this.H + 20)
    const now = performance.now()
    for (const m of this.misses) {
      const e = (now - m.t) / 1000; if (e > 1.4) continue
      const a = e < 1 ? 1 : 1 - (e - 1) / 0.4, sz = 18 * (0.6 + 0.4 * Math.min(1, e * 6)), y = this.H - 56
      t.globalAlpha = a; t.lineCap = 'round'
      t.beginPath(); t.moveTo(m.x - sz, y - sz); t.lineTo(m.x + sz, y + sz); t.moveTo(m.x + sz, y - sz); t.lineTo(m.x - sz, y + sz)
      t.strokeStyle = '#1a0d05'; t.lineWidth = 10; t.stroke(); t.strokeStyle = '#ff4800'; t.lineWidth = 5; t.stroke()
    }
    this.misses = this.misses.filter(m => now - m.t < 1400)
    for (const w of this.waves) for (const k of [0, 1]) {
      const e = (now - w.t) / 1000 - k * 0.09; if (e < 0 || e > 0.75) continue
      const q = e / 0.75, R = 30 + (1 - Math.pow(1 - q, 3)) * Math.max(this.W, this.H) * (k ? 0.45 : 0.75)
      const A = (1 - q) * (k ? 0.6 : 1), lw = (k ? 3 : 9) * (1 - q) + 1
      t.beginPath(); t.arc(w.x, w.y, R, 0, Math.PI * 2)
      if (glow) { t.shadowColor = w.col; t.shadowBlur = 26 } else { t.globalAlpha = A * 0.35; t.lineWidth = lw + 22; t.strokeStyle = w.col; t.stroke() }
      t.globalAlpha = A; t.lineWidth = lw; t.strokeStyle = '#fff4e6'; t.stroke()
    }
    t.shadowBlur = 0; this.waves = this.waves.filter(w => now - w.t < 1000)
    t.globalAlpha = 1
    // translate · rotate · flip as one setTransform (on top of the dpr scale) instead of save/restore per piece
    const k = this.fxDpr
    for (const c of this.confetti) {
      c.vy += 30 * raw; c.x += (c.vx + Math.sin(now / 300 + c.ph) * 40) * raw; c.y += c.vy * raw; c.rot += c.vr * raw
      const co = Math.cos(c.rot) * k, si = Math.sin(c.rot) * k, fy = Math.cos(now / 200 + c.ph)
      t.setTransform(co, si, -si * fy, co * fy, c.x * k, c.y * k); t.fillStyle = c.col; t.fillRect(-c.w / 2, -c.h / 2, c.w, c.h)
    }
    if (this.confetti.length) t.setTransform(k, 0, 0, k, 0, 0)
    this.confetti = this.confetti.filter(c => c.y < this.H + 30)
    t.globalAlpha = 1
  }

  private drawTrail() {
    const ctx = this.tctx, now = performance.now(), life = 200
    if (this.tDirty) { ctx.clearRect(0, 0, this.W, this.H); this.tDirty = false }
    if (this.trail.length && now - this.trail[0].t >= life) this.trail = this.trail.filter(p => now - p.t < life)
    const pts = this.trail; if (pts.length < 2) return
    this.tDirty = true
    const WM = [1, 1.8, 2.7], GC = ['rgba(255,106,0,.95)', 'rgba(255,154,0,1)', 'rgba(255,60,0,1)'], GB = [18, 30, 46], OC = ['255,106,0', '255,154,0', '255,72,0']
    const glow = this.quality.s.glow
    ctx.lineCap = 'round'
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].t - pts[i - 1].t > 120) continue
      const p0 = pts[i - 1], p1 = pts[i], a = 1 - (now - p1.t) / life, lv = p1.lv || 0, A = a.toFixed(3)
      const line = (style: string, width: number) => { ctx.strokeStyle = style; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke() }
      const core = 1.5 + a * (lv ? 7 : 9), outer = (1.5 + a * 9) * WM[lv]
      if (glow) { ctx.shadowColor = GC[lv]; ctx.shadowBlur = GB[lv] } else {
        // shadowBlur is the single most expensive thing on this canvas: fake the halo with two soft strokes
        const w = lv ? outer : core
        line(`rgba(${OC[lv]},${(a * 0.05).toFixed(3)})`, w + GB[lv] * 1.1)
        line(`rgba(${OC[lv]},${(a * 0.12).toFixed(3)})`, w + GB[lv] * 0.45)
      }
      if (lv) { line(`rgba(${OC[lv]},${A})`, outer); ctx.shadowBlur = 0 }
      line(`rgba(255,244,230,${A})`, core)
    }
    ctx.shadowBlur = 0
  }

  // ---------- flow ----------
  private clearAll() { this.items.forEach(it => this.removeObj(it.g)); this.items = []; this.queue = [] }

  /** Sizes and centres the "gioca" bubble in the gap between the intro copy and the hint. */
  private fitIntro(it: Item) {
    it.r = this.r * 1.15; it.baseY = -this.viewH * 0.1
    if (!this.H) return
    const p = this.root.querySelector<HTMLElement>('[data-intro-text]'), h = this.root.querySelector<HTMLElement>('[data-intro-hint]'); if (!p || !h) return
    const top = p.offsetTop + p.offsetHeight + 16, bot = h.offsetTop - 12; if (bot <= top) return
    const k = this.viewH / this.H, half = (bot - top) / 2 * k
    it.r = Math.max(this.r * 0.7, Math.min(it.r, (half - 0.16) / 1.56))
    it.baseY = this.viewH / 2 - (top + bot) / 2 * k
  }

  private toIntro() {
    this.mode = 'intro'
    const it = this.makeItem('start', null)
    it.float = true; it.r = this.r * 1.15; it.g.scale.setScalar(it.r); it.baseY = -this.viewH * 0.1
    it.pos.set(0, it.baseY, 0); it.g.position.copy(it.pos)
    const ring = new THREE.Group()
    for (let k = 0; k < 4; k++) { const col = k % 2 ? '#ff9a00' : '#ff6a00', m = new THREE.Mesh(this.arcGeo, this.basic('arc|' + col, { color: new THREE.Color(col), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.z = k * Math.PI / 2; m.renderOrder = 4; ring.add(m) }
    it.g.add(ring); it.ring = ring
    it.g.scale.setScalar(0.001)
    this.tween(null, 1.0, ease.outCubic, p => it.g.scale.setScalar(Math.max(0.001, it.r * p)))
    set({ phase: 'intro' })
    // wait for React to commit the intro overlay before measuring it
    requestAnimationFrame(() => requestAnimationFrame(() => { if (it.alive && it.float) { this.fitIntro(it); it.pos.y = it.baseY } }))
  }

  private startGame() {
    this.clearAll()
    this.clearFrenzy()
    this.timeScale = 1; this.tw.delete('time')
    this.score = 0; this.lives = 3; this.spawnTimer = 0.5; this.spawnCount = 0
    this.mode = 'play'
    this.clearTimeout(this.freshTO)
    set({ phase: 'play', score: 0, lives: 3, newRecord: false, fresh: null })
  }

  private loseLife(big: boolean) {
    if (this.mode !== 'play' && this.mode !== 'focus') return
    this.lives = Math.max(0, this.lives - 1)
    this.shakeAmt = big ? 0.45 : 0.2
    this.doFlash(big ? 'rgba(255,72,0,.45)' : 'rgba(255,72,0,.22)')
    set({ lives: this.lives })
    if (this.lives <= 0) this.gameOver()
  }

  private gameOver() {
    this.mode = 'over'
    this.tweenTime(0.15, 0.6, ease.outCubic)
    const best = ui().best, newRecord = this.score > best
    if (newRecord) saveBest(this.score)
    this.sfx.tone(330, 0.7, { to: 110, type: 'triangle', vol: 0.14, delay: 0.15 })
    this.after(0.9, () => {
      set({ phase: 'over', newRecord, best: Math.max(best, this.score) })
      // Sync with the blade of the "Game over" title (0.7s after the screen appears).
      this.clearTimeout(this.goSliceT)
      this.goSliceT = this.timeout(() => {
        if (this.mode !== 'over') return
        this.sfx.play('swoosh', { speed: 3.5 })
        this.sfx.play('pop', { f: 392, n: 1 })
        this.buzz(18)
      }, 700)
    })
  }
  private goSliceT?: number

  private doFlash(color: string) {
    set({ flash: 1, flashColor: color, flashT: 'none' })
    this.timeout(() => set({ flash: 0, flashT: 'opacity .6s ease-out' }), 40)
  }

  private popAnim(): PopAnim {
    return ({ 'bullet time': 'swing', tuffo: 'blur', portale: 'portal', impatto: 'tilt' } as Record<string, PopAnim>)[CONFIG.zoomStyle] || 'scale'
  }

  /** Slow-mo + camera move onto the sliced bubble, then the popup. */
  private focusOn(it: Pick<Item, 'pos' | 'tint'>, data: Project) {
    const E = ease, st = CONFIG.zoomStyle
    this.prevMode = 'play'; this.mode = 'focus'
    const tgt = it.pos.clone(); tgt.z = 0
    const fp = this.camBase.clone(), fl = this.camLook.clone(), d0 = fp.distanceTo(fl), L = new THREE.Vector3()
    const side = this.lastDir && this.lastDir.x < 0 ? -1 : 1; this.popSide = side
    const open = (sec: number) => this.after(sec, () => { const s = this.toScreen(tgt); this.openPopup(data, s.x, s.y) })
    if (st === 'bullet time') {
      this.tweenTime(0.015, 0.3, E.outCubic)
      this.tween('cam', 1.7, E.inOutQuart, p => {
        L.lerpVectors(fl, tgt, p); const a = side * 0.8 * p, d = d0 + (4.6 - d0) * p
        this.camLook.copy(L); this.camBase.set(L.x + Math.sin(a) * d, L.y + 0.7 * p, L.z + Math.cos(a) * d)
        this.fx.roll = -side * 0.1 * Math.sin(p * Math.PI / 2)
      })
      open(0.8)
    } else if (st === 'tuffo') {
      this.tweenTime(0.03, 0.35, E.outCubic)
      const pb = fp.clone().sub(fl).multiplyScalar(1.12).add(fl)
      this.tween('cam', 0.28, E.inOutCubic, p => this.camBase.lerpVectors(fp, pb, p), () => {
        const a = this.camBase.clone(), la = this.camLook.clone(), end = new THREE.Vector3(tgt.x, tgt.y, 1.7)
        this.tween('cam', 1.1, E.outExpo, p => {
          this.camBase.lerpVectors(a, end, p); this.camLook.lerpVectors(la, tgt, Math.min(1, p * 1.3))
          this.fx.fov = this.fov + 28 * p; this.fx.blur = 6 * Math.sin(Math.PI * Math.min(1, p * 1.2))
        })
      })
      open(0.62)
    } else if (st === 'portale') {
      this.tweenTime(0.04, 0.3, E.outCubic)
      this.tweenCamera(new THREE.Vector3(tgt.x * 0.6, tgt.y * 0.6, 7.5), tgt, 1.1, E.outExpo)
      open(0.22)
    } else if (st === 'impatto') {
      this.timeScale = 0; this.tw.delete('time')
      this.shakeAmt = 0.5; this.doFlash('rgba(255,244,230,.6)')
      const s0 = this.toScreen(tgt); this.waves.push({ x: s0.x, y: s0.y, t: performance.now(), col: it.tint })
      this.after(0.14, () => {
        this.tweenTime(0.04, 0.4, E.outCubic)
        this.tweenCamera(new THREE.Vector3(tgt.x * 0.9, tgt.y * 0.9, 4.2), tgt, 1.3, E.outExpo)
        this.tween('fx', 0.6, E.lin, p => { this.fx.blur = 5 * Math.sin(Math.PI * p) * (1 - p); this.fx.roll = side * 0.06 * Math.sin(Math.PI * p) })
      })
      open(0.5)
    } else {
      this.tweenTime(0.035, 0.5, E.outCubic)
      this.tweenCamera(new THREE.Vector3(tgt.x * 0.85, tgt.y * 0.85, 6.4), tgt, 1.2, E.inOutCubic)
      open(0.7)
    }
  }

  /** The popup was opened over a screen (not the running game): closing it just goes back there. */
  private backTo() { return this.prevMode === 'over' || this.prevMode === 'complete' || this.prevMode === 'intro' }

  private openPopup(data: Project, x: number, y: number) {
    set({
      popup: data, popupShown: false,
      origin: `${Math.round(x)}px ${Math.round(y)}px`, ox: Math.round(x), oy: Math.round(y),
      anim: this.popAnim(), side: this.popSide || 1, ptint: data.id === 'bitrock' ? '#ff6a00' : data.tint,
      backLabel: this.backTo() ? 'Chiudi' : 'Torna al gioco'
    })
    requestAnimationFrame(() => requestAnimationFrame(() => set({ popupShown: true })))
  }

  private pick(): { type: ItemType; data?: Project } {
    const o = this.opt(), prog = Math.min(this.score / 30, 1)
    this.spawnCount++
    if (o.bugs && this.spawnCount > 3 && Math.random() < (0.1 + 0.18 * prog) * o.bugMul) return { type: 'bug' }
    if ((!this.bitrockSeen && this.spawnCount === 7) || Math.random() < 0.05) return { type: 'bitrock', data: BITROCK }
    const hidden = PROJECTS.filter(p => !this.found.includes(p.id))
    const pool = hidden.length && Math.random() < 0.65 ? hidden : PROJECTS
    return { type: 'project', data: pool[Math.floor(Math.random() * pool.length)] }
  }

  private spawner(dt: number) {
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const o = this.opt(), prog = Math.min(this.score / 30, 1)
      this.spawnTimer = (2.5 - 1.2 * prog) / o.spawnMul
      const n = 1 + Math.floor(Math.random() * (1.4 + prog * 2.2))
      for (let i = 0; i < n; i++) this.queue.push({ t: i * (0.16 + Math.random() * 0.22), ...this.pick() })
    }
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i]; q.t -= dt
      if (q.t <= 0) { this.queue.splice(i, 1); const it = this.makeItem(q.type, q.data ?? null); this.launch(it) }
    }
  }

  // ---------- input ----------
  private onDown = (e: PointerEvent) => this.pDown(e)
  private onMove = (e: PointerEvent) => this.pMove(e)
  private onUp = (e: PointerEvent) => this.pUp(e)
  // a pointerup that happens outside the window is never delivered: forget the stroke when focus is lost
  private onBlur = () => { this.ptrDown = false; this.lastPt = null; this.strokeHits = 0; if (this.frenzy) this.frenzy.inside = false }

  private isUI(e: PointerEvent) { return !!(e.target as Element | null)?.closest?.('[data-ui]') }
  // root offset is cached in resize(): reading the rect here would force a layout on every pointer event
  private localPt(e: PointerEvent): Pt { return { x: e.clientX - this.rootX, y: e.clientY - this.rootY, t: performance.now() } }

  private pDown(e: PointerEvent) {
    if (this.isUI(e)) return
    this.sfx.ctx()
    this.ptrDown = true; this.lastPt = this.localPt(e); this.strokeHits = 0
    // a finger that lands on the logo doesn't score: only entering the circle does
    if (this.frenzy) { const f = this.frenzy; f.inside = this.inFrenzyCircle(this.lastPt); f.from = { x: this.lastPt.x, y: this.lastPt.y }; f.travel = 0; f.dir = null }
  }

  private pUp(e: PointerEvent) { this.ptrDown = false; if (e.pointerType !== 'mouse') this.lastPt = null; this.strokeHits = 0 }

  private pMove(e: PointerEvent) {
    const p = this.localPt(e)
    this.par.tx = (p.x / this.W - .5); this.par.ty = (p.y / this.H - .5)
    const a = this.lastPt; this.lastPt = p
    if (!a) return
    if (e.pointerType !== 'mouse' && !this.ptrDown) return
    if (this.mode !== 'play' && this.mode !== 'intro' && this.mode !== 'frenzy') return
    if (this.isUI(e) && !this.ptrDown) return
    const dx = p.x - a.x, dy = p.y - a.y, len = Math.hypot(dx, dy)
    if (len < 2) return
    const speed = len / Math.max(1, p.t - a.t)
    // with a mouse, a fast swipe slices even without holding the button
    if (!this.ptrDown && speed < 0.6) { this.strokeHits = 0; if (this.frenzy) this.frenzy.inside = this.inFrenzyCircle(p); return }
    const sh = this.strokeHits || 0, lv = sh >= 5 ? 2 : sh >= 3 ? 1 : 0; p.lv = lv; if (a.lv === undefined) a.lv = lv
    if (this.opt().trail) {
      if (!this.trail.length || p.t - this.trail[this.trail.length - 1].t > 120) this.trail.push(a)
      this.addCoalesced(e, p, len)
      this.trail.push(p)
      for (let k = 0; k < lv * 2; k++) this.drops.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260 - 80, r: 1.5 + Math.random() * 2, col: lv === 2 ? '#fff4e6' : '#ffc04d', life: 0.7 })
    }
    if (speed > 1.1 && p.t - this.lastSwoosh > 200) { this.lastSwoosh = p.t; this.sfx.play('swoosh', { speed }) }
    this.trySlice(a, p)
  }

  /**
   * Pointer moves arrive about once per frame, so a fast swipe would draw the blade as a few long straight
   * segments. The browser's in-between samples round it off; they only shape the trail (slicing still uses
   * the whole move), and at most ~6 are kept per move since every segment is a stroke with a glow.
   */
  private addCoalesced(e: PointerEvent, p: Pt, len: number) {
    const cs = e.getCoalescedEvents?.()
    if (!cs || cs.length < 2) return
    const step = Math.max(10, len / 6)
    let last = this.trail[this.trail.length - 1]
    for (let i = 0; i < cs.length - 1; i++) {
      const x = cs[i].clientX - this.rootX, y = cs[i].clientY - this.rootY
      if (Math.hypot(x - last.x, y - last.y) < step || Math.hypot(p.x - x, p.y - y) < step) continue
      last = { x, y, t: p.t, lv: p.lv }
      this.trail.push(last)
    }
  }

  private toScreen(v: THREE.Vector3) { const p = this.v.copy(v).project(this.camera); return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H } }

  private trySlice(a: Pt, b: Pt) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy
    const dir = { x: dx / Math.sqrt(L2), y: -dy / Math.sqrt(L2) }
    const pxPerUnit = this.H / this.viewH
    if (this.mode === 'frenzy') { this.frenzySlice(a, b); return }
    for (const it of this.items.slice()) {
      if (!it.alive) continue
      const c = this.toScreen(it.pos)
      let t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / L2; t = Math.max(0, Math.min(1, t))
      const hx = a.x + dx * t, hy = a.y + dy * t, d = Math.hypot(hx - c.x, hy - c.y)
      if (it.fruit) {
        // the first pass starts the frenzy and already counts as 1; bubbles in the same stroke are left alone
        if (d < it.cut! * pxPerUnit && this.mode === 'play') { this.startFrenzy(it); this.fruitHit(a, b, { x: hx, y: hy }); return }
        continue
      }
      // perp: distance of the cut from the centre, in radii (≈0 = perfect cut)
      if (d < it.r * pxPerUnit * 0.95) this.hit(it, dir, Math.abs((c.x - a.x) * dy - (c.y - a.y) * dx) / Math.sqrt(L2) / (it.r * pxPerUnit))
    }
  }

  private hit(it: Item, dir: Dir, perp = 1) {
    const o = this.opt(); this.lastDir = dir
    this.slice(it, dir)
    if (it.type === 'start') { this.sfx.play('start'); this.buzz(15); this.bloomPulse = 0.8 }
    if (it.type === 'bug') { this.sfx.play('bug'); this.buzz([40, 30, 90]); this.caPulse = 1; this.bloomPulse = 0.6 }
    if (it.type === 'start') { this.mode = 'starting'; set({ phase: 'starting' }); this.after(0.7, () => this.startGame()); return }
    if (it.type === 'bug') {
      if (cfg('bugRule') === 'game over' && this.mode === 'play') { this.shakeAmt = 0.7; this.doFlash('rgba(255,255,255,.9)'); this.lives = 0; set({ lives: 0 }); this.gameOver() }
      else this.loseLife(true)
      return
    }
    if (this.mode !== 'play') return
    this.strokeHits = (this.strokeHits || 0) + 1
    const idx = it.data ? PROJECTS.indexOf(it.data) : -1, base = [523, 587, 659, 784, 880, 1047][idx] || 660
    this.sfx.play('pop', { f: base * Math.pow(2, Math.min(this.strokeHits - 1, 7) / 6), n: this.strokeHits }); this.buzz(8)
    const perfect = perp < 0.2, cp = this.toScreen(it.pos)
    let pts = 1
    if (perfect) pts += 2
    if (this.strokeHits >= 3) { pts += this.strokeHits === 3 ? 3 : 1; this.showCombo(this.strokeHits, cp.x, cp.y); this.bloomPulse = Math.max(this.bloomPulse, 0.5) }
    this.score += pts
    const upd: Partial<UIState> = { score: this.score }
    let reveal = false
    if (it.type === 'project') {
      const id = it.data!.id, first = !this.found.includes(id)
      if (first) {
        this.found = [...this.found, id]; upd.found = this.found; upd.fresh = id; this.clearTimeout(this.freshTO)
        if (this.found.length === PROJECTS.length && !this.allDone) {
          this.allDone = true; this.allPending = true
          if (!ui().unlockedAll) { saveUnlocked(); upd.unlockedAll = true }
        }
      }
      reveal = o.popups && (first || o.always)
    }
    set(upd)
    if (perfect) { this.showPerfect(cp.x, cp.y - 64); this.buzz([0, 12, 30, 12]); this.bloomPulse = 1; this.caPulse = Math.max(this.caPulse, 0.4) }
    if (reveal && !this.focusPending) { this.focusPending = true; this.focusOn(it, it.data!) }
    else {
      // no popup for this one (another is on its way, or "Solo gioco" is on): its pill starts the countdown now
      if (upd.fresh) this.freshOff()
      if (this.allPending && !o.popups) this.finishAll()
      else if (perfect) { this.tweenTime(0.2, 0.06, ease.outCubic); this.after(0.28, () => { if (this.mode === 'play') this.tweenTime(1, 0.4, ease.inCubic) }) }
    }
  }

  // ---------- frutto Bitrock: raffica ----------
  private hudEl(k: 'fill' | 'num' | 'fx') {
    return this.hud[k] ??= this.root.querySelector<HTMLElement>(`[data-frenzy="${k}"]`) ?? undefined
  }

  private toWorld(x: number, y: number) {
    const c = this.camera.position, d = this.fv.set(x / this.W * 2 - 1, -(y / this.H * 2 - 1), 0.5).unproject(this.camera).sub(c).normalize()
    return c.clone().addScaledVector(d, -c.z / d.z)
  }

  /** Blade circle of the hanging logo, in px: a bit wider than the cut radius so a pass can't slip by. */
  private frenzyRadius(f: Frenzy) { return 0.92 * f.it.g.scale.x * 1.15 * this.H / this.viewH }

  private inFrenzyCircle(p: { x: number; y: number }) {
    const f = this.frenzy; if (!f) return false
    const c = this.toScreen(f.it.pos)
    return Math.hypot(p.x - c.x, p.y - c.y) < this.frenzyRadius(f)
  }

  private startFrenzy(it: Item) {
    const w = (a: number) => Math.atan2(Math.sin(a), Math.cos(a)), r = it.shell.rotation
    r.set(w(r.x), w(r.y), w(r.z))
    this.mode = 'frenzy'
    this.frenzy = { it, t: 0, dur: 3, hits: 0, open: 0, punch: 0, base: it.g.scale.x, wob: new THREE.Vector3(), kick: [0, 1, 2, 3].map(() => new THREE.Vector3()), inside: true, from: null, travel: 0, dir: null }
    // the logo is driven by tickFrenzy from now on
    this.items = this.items.filter(i => i !== it)
    this.tweenTime(0.12, 0.3, ease.outCubic)
    const num = this.hudEl('num'); if (num) num.textContent = '0'
    set({ frenzy: true })
  }

  /**
   * In the frenzy only the logo can be cut. A pass counts when the blade enters its circle, or when it
   * turns back (> 90°) while still over it: the logo is big, so a back-and-forth swipe may never leave it.
   * Not on every frame the blade stays inside, and a minimum travel keeps a still, jittering finger from scoring.
   */
  private frenzySlice(a: Pt, b: Pt) {
    const f = this.frenzy; if (!f) return
    const c = this.toScreen(f.it.pos), R = this.frenzyRadius(f), dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, len = Math.sqrt(L2)
    const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / L2)), hx = a.x + dx * t, hy = a.y + dy * t
    if (Math.hypot(hx - c.x, hy - c.y) < R) {
      if (!f.inside) this.fruitHit(a, b, { x: hx, y: hy })
      else {
        f.travel += len
        if (!f.dir) {
          // the leg's direction comes from the displacement since its start, not from one (possibly mid-turn) segment
          const o = f.from ?? a, ex = b.x - o.x, ey = b.y - o.y, el = Math.hypot(ex, ey)
          if (el > R * 0.15) f.dir = { x: ex / el, y: ey / el }
        } else if ((dx * f.dir.x + dy * f.dir.y) / len < -0.1 && f.travel > R * 0.35) this.fruitHit(a, b, { x: hx, y: hy })
      }
    }
    f.inside = Math.hypot(b.x - c.x, b.y - c.y) < R
  }

  private fruitHit(a: Pt, b: Pt, hp: { x: number; y: number }) {
    const f = this.frenzy!, s = f.it.g.scale.x
    f.hits++; this.score += 1; f.punch = 1
    set({ score: this.score })
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, sx = dx / l, sy = dy / l
    f.from = { x: b.x, y: b.y }; f.travel = 0; f.dir = null
    this.lastDir = { x: sx, y: -sy }
    f.wob.x += sy * 3.5; f.wob.y += sx * 3.5; f.wob.z += (Math.random() - 0.5) * 3
    f.open = Math.min(1, f.open + 0.075)
    f.kick.forEach(k => k.add(this.fv.set((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.3)))
    const wp = this.toWorld(hp.x, hp.y), wd = new THREE.Vector3(sx, -sy, 0)
    this.slashMark(wp, wd, s)
    for (let i = 0; i < 8; i++) {
      const vel = wd.clone().multiplyScalar((1.5 + Math.random() * 3) * s).add(new THREE.Vector3((Math.random() - 0.5) * 2.4 * s, (Math.random() - 0.5) * 2.4 * s, Math.random() * s))
      this.spark(wp, vel, ['#ffd27a', '#ff9a00', '#fff2dc'][i % 3], (0.17 + Math.random() * 0.13) * s, 0.35 + Math.random() * 0.3, 3 * s)
    }
    this.fxText('+1', hp.x + (Math.random() - 0.5) * 30, hp.y - 24, false)
    const num = this.hudEl('num')
    if (num) { num.textContent = String(f.hits); num.animate([{ transform: 'scale(1.45)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' }) }
    this.sfx.play('pop', { f: 392 * Math.pow(2, Math.min(f.hits, 18) / 12), n: f.hits }); this.buzz(8)
  }

  private tickFrenzy(f: Frenzy, raw: number) {
    const it = f.it, k = 1 - Math.exp(-7 * raw), short = this.H < 520
    // the logo comes to the middle; on short screens the bar and counter take more room: lower and a bit smaller
    it.pos.lerp(this.fv.set(0, this.viewH * (short ? -0.06 : 0.05), 0), k)
    f.base += (Math.min(this.viewH * (short ? 0.15 : 0.17), this.viewW * 0.36) - f.base) * k
    f.punch *= Math.exp(-9 * raw); f.wob.multiplyScalar(Math.exp(-5 * raw))
    const kr = 1 - Math.exp(-4 * raw), rot = it.shell.rotation
    rot.x += f.wob.x * raw + (0.15 - rot.x) * kr
    rot.y += f.wob.y * raw + (-0.3 - rot.y) * kr
    rot.z += f.wob.z * raw + (0 - rot.z) * kr
    it.g.position.copy(it.pos)
    it.g.scale.setScalar(f.base * (1 + 0.12 * f.punch))
    it.shell.children.forEach((m, i) => {
      const e = this.bands[i].ex; f.kick[i].multiplyScalar(Math.exp(-8 * raw))
      m.position.set(e[0] * f.open * 0.42, e[1] * f.open * 0.42, e[2] * f.open).add(f.kick[i])
    })
    const halo = it.halo!, mat = halo.material as THREE.SpriteMaterial
    mat.opacity += (0.28 + 0.25 * f.punch - mat.opacity) * (1 - Math.exp(-8 * raw))
    halo.scale.setScalar(halo.scale.x + (4.2 - halo.scale.x) * k)
    f.t += raw
    const fill = this.hudEl('fill'); if (fill) fill.style.transform = `scaleX(${Math.max(0, 1 - f.t / f.dur)})`
    if (f.t >= f.dur) this.fruitFinale(f)
  }

  private fruitFinale(f: Frenzy) {
    const it = f.it, s = it.g.scale.x, center = it.pos.clone(), vh = this.viewH
    this.frenzy = null
    set({ frenzy: false })
    this.tweenTime(1, 0.25, ease.outCubic)
    // bands fly off along their own axis; they follow the game clock, so they hang mid-air when the popup zooms in
    it.g.updateMatrixWorld(true)
    const q = it.shell.getWorldQuaternion(new THREE.Quaternion())
    ;([...it.shell.children] as THREE.Mesh[]).forEach((m, i) => {
      const e = this.bands[i].ex
      this.scene.attach(m)
      const d = new THREE.Vector3(e[0], e[1], 0).applyQuaternion(q)
      if (d.length() < 0.1) d.set((Math.random() - 0.5) * 0.6, 0.1, 1)
      d.normalize().multiplyScalar(0.7 * vh).add(new THREE.Vector3((Math.random() - 0.5) * 0.26 * vh, 0.5 * vh, (Math.random() - 0.5) * 0.2 * vh))
      this.parts.push({ o: m, kind: 'band', vel: d, w: new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6), g: 1.6 * vh, drag: 0, life: 2.4, max: 2.4, s0: m.scale.clone() })
    })
    // what is left of the logo (the halo) fades out
    this.parts.push({ o: it.g, kind: 'halo', vel: new THREE.Vector3(), g: 0, drag: 0, life: 0.6, max: 0.6, s0: it.g.scale.clone() })
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 4) * s
      this.spark(center, new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp, Math.random() * 2 * s), ['#ffd27a', '#ff9a00', '#fff2dc', '#ff6a00'][i % 4], (0.2 + Math.random() * 0.2) * s, 0.5 + Math.random() * 0.5, 2 * s)
    }
    const fx = this.hudEl('fx')
    if (fx) { const fl = document.createElement('div'); fl.className = 'fx-flash'; fx.appendChild(fl); this.timeout(() => fl.remove(), 600) }
    const c = this.toScreen(center)
    this.fxText('+' + f.hits, c.x, c.y, true)
    this.sfx.play('pop', { f: 784, n: 1 }); this.timeout(() => this.sfx.play('pop', { f: 784 * 1.5, n: 1 }), 90); this.buzz(30)
    this.after(0.5, () => {
      const o = this.opt()
      if (o.popups && (!this.bitrockSeen || o.always)) {
        this.bitrockSeen = true; this.focusPending = true
        this.focusOn({ pos: center, tint: '#ff6a00' }, BITROCK)
      } else this.mode = 'play'
    })
  }

  /** Drops everything of an unfinished frenzy (new game). */
  private clearFrenzy() {
    if (this.frenzy) this.removeObj(this.frenzy.it.g)
    this.frenzy = null
    for (const p of this.parts) this.dropPart(p)
    this.parts = []
    set({ frenzy: false })
  }

  private addPart(o: THREE.Object3D, kind: Part['kind'], vel: THREE.Vector3, life: number, g = 0, drag = 0) {
    this.scene.add(o)
    this.parts.push({ o, kind, vel, g, drag, life, max: life, s0: o.scale.clone() })
  }

  private spark(p: THREE.Vector3, vel: THREE.Vector3, color: string, size: number, life: number, g: number) {
    const sp = this.sparkPool.pop() ?? new THREE.Sprite(new THREE.SpriteMaterial({ map: this.radialTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    sp.material.color.set(color); sp.material.opacity = 1
    sp.position.copy(p); sp.position.z += 0.4; sp.scale.setScalar(size); sp.renderOrder = 12
    this.addPart(sp, 'spark', vel, life, g, 1.5)
  }

  private slashMark(p: THREE.Vector3, d: THREE.Vector3, s: number) {
    const m = this.markPool.pop() ?? new THREE.Mesh(this.planeGeo, new THREE.MeshBasicMaterial({ map: this.radialTex, color: new THREE.Color('#fff3e0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
    ;(m.material as THREE.MeshBasicMaterial).opacity = 1
    m.position.set(p.x, p.y, 0.8); m.rotation.z = Math.atan2(d.y, d.x); m.scale.set(3.7 * s, 0.17 * s, 1); m.renderOrder = 12
    this.addPart(m, 'mark', new THREE.Vector3(), 0.22)
  }

  private stepParts(dt: number, raw: number) {
    if (!this.parts.length) return
    const hw = this.viewW / 2 + 1, bottom = -this.viewH / 2
    this.parts = this.parts.filter(p => {
      const d = p.kind === 'band' ? dt : raw, o = p.o
      p.life -= d
      let dead = p.life <= 0
      if (!dead) {
        p.vel.y -= p.g * d; if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * d)); o.position.addScaledVector(p.vel, d)
        const k = p.life / p.max
        if (p.kind === 'spark') { (o as THREE.Sprite).material.opacity = Math.min(1, k * 1.5); o.scale.copy(p.s0).multiplyScalar(0.3 + 0.7 * k) }
        else if (p.kind === 'mark') ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = k
        else if (p.kind === 'halo') ((o.children[1] as THREE.Sprite).material as THREE.SpriteMaterial).opacity *= Math.exp(-8 * d)
        else if (p.kind === 'band') {
          if (p.life < 0.35) o.scale.copy(p.s0).multiplyScalar(p.life / 0.35)
          if (p.w) { o.rotation.x += p.w.x * d; o.rotation.y += p.w.y * d; o.rotation.z += p.w.z * d }
          dead = o.position.y < bottom - p.s0.x * 2 || Math.abs(o.position.x) > hw + p.s0.x * 2
        }
      }
      if (dead) this.dropPart(p)
      return !dead
    })
  }

  /** Takes a finished effect out of the scene: sparks and marks go back to their pool, the rest is disposed. */
  private dropPart(p: Part) {
    if (p.kind === 'spark') { this.scene.remove(p.o); this.sparkPool.push(p.o as THREE.Sprite) }
    else if (p.kind === 'mark') { this.scene.remove(p.o); this.markPool.push(p.o as THREE.Mesh) }
    else this.removeObj(p.o)
  }

  // ---------- loop ----------
  private frame(t: number) {
    const ms = t - this.last, raw = Math.min(ms / 1000, 0.05); this.last = t
    if ((this.mode === 'play' || this.mode === 'intro') && this.quality.sample(ms)) this.applyQuality()
    this.updateTweens(raw)
    const dt = raw * this.timeScale
    this.uTime.value += dt
    if (this.mode === 'play') this.spawner(dt)
    if (this.mode === 'focus' || this.mode === 'over') this.spawner(0)

    const bottom = -this.viewH / 2
    for (const it of this.items.slice()) {
      if (!it.alive) continue
      if (it.float) { it.pos.y = it.baseY + Math.sin(this.uTime.value * 1.6) * 0.14; it.pos.x = Math.sin(this.uTime.value * 0.9) * 0.08 }
      else { it.vel.y -= this.g * dt; it.pos.addScaledVector(it.vel, dt) }
      it.g.position.copy(it.pos)
      if (it.fruit) { const u = this.uTime.value; it.shell.rotation.x = Math.sin(u * 1.1 + it.ph) * 0.35; it.shell.rotation.y = Math.sin(u * 1.4 + it.ph * 1.7) * 0.55 }
      else { it.shell.rotation.x += it.spin.x * dt; it.shell.rotation.y += it.spin.y * dt }
      it.shell.rotation.z += it.spin.z * dt
      it.logo.rotation.z = Math.sin(this.uTime.value * 1.3 + it.ph) * 0.1
      if (it.ring) it.ring.rotation.z -= raw * 1.4
      if (it.spark) it.spark.scale.setScalar(0.2 + Math.random() * 0.12)
      if (!it.float && it.vel.y < 0 && it.pos.y < bottom - it.r * 1.3) {
        this.removeItem(it)
        if (it.type === 'project' && this.mode === 'play') { const mx = Math.max(30, Math.min(this.W - 30, this.toScreen(it.pos).x)); this.misses.push({ x: mx, t: performance.now() }); this.sfx.play('miss'); this.buzz(25); this.loseLife(false) }
      }
    }
    this.items = this.items.filter(i => i.alive)
    if (this.frenzy) this.tickFrenzy(this.frenzy, raw)
    this.stepParts(dt, raw)

    for (const h of this.halves.slice()) {
      h.age += dt; h.vel.y -= this.g * dt; h.pos.addScaledVector(h.vel, dt)
      h.g.rotateOnWorldAxis(this.Z, h.spinZ * dt); h.g.rotateOnWorldAxis(h.axis, h.tumble * dt)
      h.ringMat.opacity = Math.max(0, 1 - h.age * 1.6)
      if (h.pos.y < bottom - 3) { this.removeObj(h.g); h.dead = true }
    }
    this.halves = this.halves.filter(h => !h.dead)

    const dp = this.dust.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + dt * 0.6; if (y > 12) y = -12; dp.setY(i, y) }
    dp.needsUpdate = true

    const idle = this.mode === 'play' || this.mode === 'intro'
    const k = 1 - Math.exp(-raw * 3)
    this.par.x += ((idle ? this.par.tx : 0) - this.par.x) * k; this.par.y += ((idle ? this.par.ty : 0) - this.par.y) * k
    this.shakeAmt *= Math.exp(-raw * 7)
    const s = this.shakeAmt
    const sx = (Math.random() - .5) * s, sy = (Math.random() - .5) * s
    this.camera.position.set(this.camBase.x + this.par.x * 0.6 + sx, this.camBase.y - this.par.y * 0.4 + sy, this.camBase.z)
    this.camera.lookAt(this.camLook.x + sx * 0.5, this.camLook.y + sy * 0.5, this.camLook.z)
    const fx = this.fx
    if (fx.roll) this.camera.rotateZ(fx.roll)
    if (Math.abs(this.camera.fov - fx.fov) > 1e-3) { this.camera.fov = fx.fov; this.camera.updateProjectionMatrix() }
    if (fx.blur !== this.blurNow) { this.blurNow = fx.blur; this.renderer!.domElement.style.filter = fx.blur > 0.05 ? `blur(${fx.blur.toFixed(2)}px)` : 'none' }
    this.caPulse *= Math.exp(-raw * 4); this.bloomPulse *= Math.exp(-raw * 3)
    // Behind a still popup/settings panel/projects sheet/game over screen the scene barely moves, but every
    // WebGL frame forces the overlay's backdrop blur to be recomputed: draw at half rate there.
    // Once nothing visibly moves any more, stop drawing altogether: unchanged canvases let the browser reuse the blur.
    const u = ui(), calm = (u.popupShown || u.settingsOpen || u.listShown || u.phase === 'over') && !this.tw.has('cam') && !this.tw.has('fx')
    if (calm && !this.redraw && this.isStill()) return
    if (this.redraw || !calm || ++this.frameNo % 2 === 0) { if (this.post) this.renderPost(); else this.renderer!.render(this.scene, this.camera) }
    this.redraw = false
    this.drawTrail()
    this.drawFx(dt, raw)
  }

  /**
   * Nothing on screen would visibly change: game time (nearly) stopped or nothing left in flight,
   * and every real-time effect (sparks, drops, waves, shake, parallax, pulses) has run out.
   */
  private isStill() {
    if (this.drops.length || this.waves.length || this.misses.length || this.confetti.length || this.trail.length) return false
    if (this.shakeAmt > 2e-3 || Math.abs(this.par.x) + Math.abs(this.par.y) > 5e-3 || this.bloomPulse > 0.01 || this.caPulse > 0.01) return false
    if (this.parts.some(p => p.kind !== 'band')) return false
    return this.timeScale <= 0.05 || (!this.items.length && !this.halves.length && !this.parts.length)
  }
}

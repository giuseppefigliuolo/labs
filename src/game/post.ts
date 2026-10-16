import * as THREE from 'three'
import { BLUR_F, BRIGHT_F, COMP_F, POST_V } from './shaders'

const target = (samples = 0) =>
  new THREE.WebGLRenderTarget(1, 1, { samples, depthBuffer: !!samples })

const pass = (uniforms: Record<string, THREE.IUniform>, fragmentShader: string) =>
  new THREE.ShaderMaterial({ uniforms, vertexShader: POST_V, fragmentShader, depthTest: false, depthWrite: false, blending: THREE.NoBlending })

/**
 * Bloom + chromatic aberration. Objects on layer 1 (the sliced halves) skip
 * the effect and are drawn on top of the composite with fresh depth.
 */
export class PostFX {
  private scene: THREE.WebGLRenderTarget
  private a = target()
  private b = target()
  private w = 1
  private h = 1
  private fw = 1
  private fh = 1
  private bright = pass({ tMap: { value: null }, uTh: { value: 0.62 }, uTx: { value: new THREE.Vector2(1, 1) } }, BRIGHT_F)
  private blur = pass({ tMap: { value: null }, uDir: { value: new THREE.Vector2() } }, BLUR_F)
  private comp = pass({ tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 1 }, uCA: { value: 0 } }, COMP_F)
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private quadScene = new THREE.Scene()
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.comp)

  constructor(samples = 4) {
    this.scene = target(samples)
    this.quad.frustumCulled = false
    this.quadScene.add(this.quad)
  }

  /** MSAA sample count of the scene target (recreated, since three can't change it in place). */
  setSamples(samples: number) {
    if (this.scene.samples === samples) return
    this.scene.dispose()
    this.scene = target(samples)
    this.scene.setSize(this.fw, this.fh)
  }

  setSize(W: number, H: number, pr: number) {
    const w = this.fw = Math.max(1, Math.floor(W * pr)), h = this.fh = Math.max(1, Math.floor(H * pr))
    this.scene.setSize(w, h)
    this.w = Math.max(1, w >> 2); this.h = Math.max(1, h >> 2)
    this.a.setSize(this.w, this.h); this.b.setSize(this.w, this.h)
    this.bright.uniforms.uTx.value.set(1 / w, 1 / h)
  }

  render(r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, o: { bloom: number; ca: number; uBloom: number; uCA: number; hasOverlay: boolean }) {
    const { bloom: bl, ca } = o, q = this.quad, sc = this.quadScene, cam = this.cam
    if (bl <= 0 && ca <= 0) { r.setRenderTarget(null); camera.layers.enable(1); r.render(scene, camera); camera.layers.set(0); return }
    r.setRenderTarget(this.scene); r.render(scene, camera)
    if (bl > 0) {
      q.material = this.bright; this.bright.uniforms.tMap.value = this.scene.texture; this.bright.uniformsNeedUpdate = true; r.setRenderTarget(this.a); r.render(sc, cam)
      q.material = this.blur; const u = this.blur.uniforms
      for (let i = 0; i < 2; i++) {
        u.tMap.value = this.a.texture; u.uDir.value.set((1 + i) / this.w, 0); this.blur.uniformsNeedUpdate = true; r.setRenderTarget(this.b); r.render(sc, cam)
        u.tMap.value = this.b.texture; u.uDir.value.set(0, (1 + i) / this.h); this.blur.uniformsNeedUpdate = true; r.setRenderTarget(this.a); r.render(sc, cam)
      }
    }
    q.material = this.comp; const c = this.comp.uniforms
    c.tScene.value = this.scene.texture; c.tBloom.value = this.a.texture
    c.uBloom.value = o.uBloom; c.uCA.value = o.uCA
    this.comp.uniformsNeedUpdate = true
    r.setRenderTarget(null); r.render(sc, cam)
    if (o.hasOverlay) { camera.layers.set(1); r.autoClear = false; r.clearDepth(); r.render(scene, camera); r.autoClear = true; camera.layers.set(0) }
  }

  dispose() {
    this.scene.dispose(); this.a.dispose(); this.b.dispose()
    this.bright.dispose(); this.blur.dispose(); this.comp.dispose()
  }
}

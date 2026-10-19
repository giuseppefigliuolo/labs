import * as THREE from 'three'

/**
 * 3D Bitrock logo: four extruded bands, shape and cut lines traced from
 * assets/bitrock.png. Copied as-is from the "Frutto Bitrock 3D" prototype
 * (S, geom2d, clip, smooth, makeEnv and the `bands` part of buildGeos):
 * do not retouch the numbers.
 */

type V2 = [number, number]
type Line = [V2, V2, number]
export type Band = { geo: THREE.BufferGeometry; poly: V2[]; color: string; ex: [number, number, number] }

export const BAND_COLORS = ['#ff9200', '#ff7d00', '#fd5c01', '#fa3e00']

// ---------- 2D logo geometry (traced from assets/bitrock.png, 200px) ----------
const S = (x: number, y: number): V2 => [(x - 100) / 88, (99 - y) / 88]

let g2: { outline: V2[]; lines: Line[] } | undefined
function geom2d() {
  if (g2) return g2
  const V = [S(125, -13), S(217, 196), S(-34, 129)], R = [63 / 88, 93 / 88, 110 / 88], out: V2[] = []
  for (let i = 0; i < 3; i++) {
    const C = V[i], P = V[(i + 2) % 3], N = V[(i + 1) % 3]
    const u = (A: V2): V2 => { const dx = A[0] - C[0], dy = A[1] - C[1], l = Math.hypot(dx, dy); return [dx / l, dy / l] }
    const d1 = u(P), d2 = u(N), r = R[i]
    const a = [C[0] + d1[0] * r, C[1] + d1[1] * r], b = [C[0] + d2[0] * r, C[1] + d2[1] * r]
    for (let k = 0; k <= 22; k++) { const t = k / 22, m = 1 - t; out.push([m * m * a[0] + 2 * m * t * C[0] + t * t * b[0], m * m * a[1] + 2 * m * t * C[1] + t * t * b[1]]) }
  }
  const lines: Line[] = [[S(70, 39), S(160, 74), 2.2 / 88], [S(60, 49.5), S(160, 88.5), 3.4 / 88], [S(80, 155.5), S(170, 121.5), 3.0 / 88]]
  return g2 = { outline: out, lines }
}

function clip(poly: V2[], L: Line, keepLeft: boolean, g: number) {
  const P = L[0], Q = L[1], dx = Q[0] - P[0], dy = Q[1] - P[1], len = Math.hypot(dx, dy)
  const f = (X: V2) => ((dx * (X[1] - P[1]) - dy * (X[0] - P[0])) / len) * (keepLeft ? 1 : -1) - g
  const out: V2[] = []
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], fa = f(A), fb = f(B)
    if (fa >= 0) out.push(A)
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]) }
  }
  return out
}

function smooth(geo: THREE.BufferGeometry, crease: number) {
  if (geo.index) geo = geo.toNonIndexed()
  const p = geo.attributes.position.array as Float32Array, n = p.length / 3, fn = new Float32Array(p.length)
  for (let f = 0; f < n; f += 3) {
    const i = f * 3, ax = p[i + 3] - p[i], ay = p[i + 4] - p[i + 1], az = p[i + 5] - p[i + 2], bx = p[i + 6] - p[i], by = p[i + 7] - p[i + 1], bz = p[i + 8] - p[i + 2]
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx; const l = Math.hypot(cx, cy, cz)
    if (l > 1e-12) { cx /= l; cy /= l; cz /= l } else { cx = cy = cz = 0 }
    for (let k = 0; k < 3; k++) { fn[i + k * 3] = cx; fn[i + k * 3 + 1] = cy; fn[i + k * 3 + 2] = cz }
  }
  const map = new Map<string, number[]>()
  for (let j = 0; j < n; j++) { const k = Math.round(p[j * 3] * 1e4) + ',' + Math.round(p[j * 3 + 1] * 1e4) + ',' + Math.round(p[j * 3 + 2] * 1e4); let a = map.get(k); if (!a) map.set(k, a = []); a.push(j) }
  const out = new Float32Array(p.length), ct = Math.cos(crease)
  for (const a of map.values()) for (const j of a) {
    let sx = 0, sy = 0, sz = 0
    for (const q of a) { const d = fn[j * 3] * fn[q * 3] + fn[j * 3 + 1] * fn[q * 3 + 1] + fn[j * 3 + 2] * fn[q * 3 + 2]; if (d >= ct) { sx += fn[q * 3]; sy += fn[q * 3 + 1]; sz += fn[q * 3 + 2] } }
    const l = Math.hypot(sx, sy, sz) || 1; out[j * 3] = sx / l; out[j * 3 + 1] = sy / l; out[j * 3 + 2] = sz / l
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return geo
}

/** The four bands (top to bottom), each with its geometry, outline, colour and "explosion" direction. */
export function buildBands(): Band[] {
  const { outline, lines } = geom2d(), BS = 0.025
  const [L1, L2, L3] = lines, c = (p: V2[], L: Line, left: boolean) => clip(p, L, left, L[2] + BS)
  const polys = [c(outline, L1, true), c(c(outline, L1, false), L2, true), c(c(outline, L2, false), L3, true), c(outline, L3, false)]
  const nrm = (L: Line): V2 => { const dx = L[1][0] - L[0][0], dy = L[1][1] - L[0][1], l = Math.hypot(dx, dy); return [-dy / l, dx / l] }
  const n1 = nrm(L1), n3 = nrm(L3)
  const ex: Band['ex'][] = [[n1[0], n1[1], 0.3], [n1[0] * 0.5, n1[1] * 0.5, 0.15], [0, 0, 0], [-n3[0] * 0.8, -n3[1] * 0.8, -0.25]]
  return polys.map((p, i) => {
    let geo: THREE.BufferGeometry = new THREE.ExtrudeGeometry(new THREE.Shape(p.map(q => new THREE.Vector2(q[0], q[1]))), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: BS, bevelSegments: 4, curveSegments: 8, steps: 1 })
    geo.translate(0, 0, -0.15); geo = smooth(geo, 0.8)
    return { geo, poly: p, color: BAND_COLORS[i], ex: ex[i] }
  })
}

/** Studio-like reflections for the PBR materials (only MeshStandard/Physical read `scene.environment`). */
export function makeEnv(r: THREE.WebGLRenderer) {
  const s = new THREE.Scene()
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x1a0f09, side: THREE.BackSide })))
  const panel = (w: number, h: number, pos: [number, number, number], c: string, i: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m) }
  panel(6, 3, [0, 5, 3], '#ffffff', 2.4); panel(3, 5, [-5, 1, 2], '#ffe4c8', 1.5); panel(3, 4, [5, -1, 1], '#ff8a3a', 1.3); panel(8, 2, [0, -5, 0], '#3a2010', 1)
  const pm = new THREE.PMREMGenerator(r), tex = pm.fromScene(s, 0.02).texture; pm.dispose(); return tex
}

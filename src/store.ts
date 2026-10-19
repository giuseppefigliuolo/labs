import { create } from 'zustand'
import { CONFIG, type Settings } from './config'
import type { Project } from './data/projects'

const KEY_BEST = 'bitrock-labs-best'
const KEY_SETTINGS = 'bitrock-labs-settings'
const KEY_MUTED = 'bitrock-labs-muted'
const KEY_UNLOCKED = 'bitrock-labs-unlocked'

export type Phase = 'loading' | 'intro' | 'starting' | 'play' | 'over'
export type PopAnim = 'scale' | 'swing' | 'blur' | 'portal' | 'tilt'
export type Orient = 'portrait' | 'landscape'

export type UIState = {
  phase: Phase
  score: number
  best: number
  lives: number
  found: string[]
  /** Project just discovered: its tray pill shows the full name for a while. */
  fresh: string | null
  newRecord: boolean
  muted: boolean
  complete: boolean
  /** Logo frenzy in progress: shows the veil, time bar and counter. */
  frenzy: boolean
  settings: Partial<Settings>
  settingsOpen: boolean
  // projects bottom sheet: mounted while listOpen, slid in while listShown
  listOpen: boolean
  listShown: boolean
  /** Sheet opened from the top bar: lists every project as found, whatever the current run. */
  listAll: boolean
  /** Every project found at least once (in any run, kept across visits): unlocks the top bar list. */
  unlockedAll: boolean
  // device: coarse pointer, portrait viewport, "Ruota il telefono" overlay and the orientation it asks for
  touch: boolean
  portrait: boolean
  rotateHint: boolean
  rotateTo: Orient
  // project popup
  popup: Project | null
  popupShown: boolean
  origin: string
  ox: number
  oy: number
  anim: PopAnim
  side: number
  ptint: string
  backLabel: string
  // screen flash
  flash: number
  flashColor: string
  flashT: string
  // floating labels
  combo: string
  comboPts: string
  comboX: string
  comboY: string
  comboOn: boolean
  perfOn: boolean
  perfX: string
  perfY: string
}

const read = (k: string) => {
  try { return localStorage.getItem(k) } catch { return null }
}
export const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* storage unavailable */ }
}

// Only player-facing settings are kept: older saves may still carry `popupStyle`,
// which is project config and must be ignored.
const initialSettings = (): Partial<Settings> => {
  try {
    const { difficulty, bugRule, sfondo, soloGioco } = JSON.parse(read(KEY_SETTINGS) || '{}') || {}
    return { ...(difficulty && { difficulty }), ...(bugRule && { bugRule }), ...(sfondo && { sfondo }), ...(typeof soloGioco === 'boolean' && { soloGioco }) }
  } catch { return {} }
}

export const useUI = create<UIState>(() => ({
  phase: 'loading',
  score: 0,
  best: +(read(KEY_BEST) || 0),
  lives: 3,
  found: [],
  fresh: null,
  newRecord: false,
  muted: read(KEY_MUTED) === '1',
  complete: false,
  frenzy: false,
  settings: initialSettings(),
  settingsOpen: false,
  listOpen: false,
  listShown: false,
  listAll: false,
  unlockedAll: read(KEY_UNLOCKED) === '1',
  touch: false,
  portrait: false,
  rotateHint: false,
  rotateTo: 'landscape',
  popup: null,
  popupShown: false,
  origin: '50% 50%',
  ox: 0,
  oy: 0,
  anim: 'scale',
  side: 1,
  ptint: '#ff6a00',
  backLabel: 'Torna al gioco',
  flash: 0,
  flashColor: 'rgba(255,72,0,.5)',
  flashT: 'none',
  combo: '',
  comboPts: '',
  comboX: '50%',
  comboY: '30%',
  comboOn: false,
  perfOn: false,
  perfX: '50%',
  perfY: '30%'
}))

/** Player setting if set, otherwise the build-time default. */
export const cfg = <K extends keyof Settings>(k: K, settings = useUI.getState().settings): Settings[K] =>
  settings[k] ?? CONFIG[k]

export const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => {
  const settings = { ...useUI.getState().settings, [k]: v }
  write(KEY_SETTINGS, JSON.stringify(settings))
  useUI.setState({ settings })
}

export const saveBest = (best: number) => write(KEY_BEST, String(best))
export const saveUnlocked = () => write(KEY_UNLOCKED, '1')
export const saveMuted = (m: boolean) => write(KEY_MUTED, m ? '1' : '0')

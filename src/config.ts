// Design knobs. In the Claude Design prototype these were editor props;
// here they are build-time constants. Values marked "(settings)" are only the
// default: the player can override them from the Impostazioni panel. The rest
// (popup style included) are project config only.

export type TitleFont = 'lilita one' | 'luckiest guy' | 'titan one' | 'bungee' | 'bowlby one' | 'nunito'
export type PopupStyle = 'attuale' | 'arcade' | 'vetro' | 'carta'
export type ZoomStyle = 'attuale' | 'bullet time' | 'tuffo' | 'portale' | 'impatto'
export type Difficulty = 'facile' | 'normale' | 'difficile'
export type BugRule = 'game over' | '-1 vita'
export type PopupMode = 'prima volta' | 'ogni taglio'
export type SliceStyle = 'solido' | 'lucido' | 'cartoon' | 'trasparente'
export type SliceSound = 'mela' | 'succoso' | 'anguria' | 'morbido' | 'originale'
export type Sfondo = 'legno' | 'griglia' | 'punti' | 'orizzonte' | 'carbonio' | 'ardesia' | 'minimale'

export const CONFIG = {
  // Popup
  titleFont: 'bungee' as TitleFont,
  popupStyle: 'carta' as PopupStyle,
  // Transizione
  zoomStyle: 'attuale' as ZoomStyle,
  // Gioco
  difficulty: 'normale' as Difficulty, // (settings)
  bugs: true,
  bugRule: 'game over' as BugRule, // (settings)
  popupMode: 'prima volta' as PopupMode,
  soloGioco: false, // (settings) no project popups: slicing never stops the game
  // Effetti
  sliceStyle: 'lucido' as SliceStyle,
  sliceSound: 'mela' as SliceSound,
  trail: true,
  bloom: 0.8, // 0..2
  aberration: 1, // 0..2
  // Audio
  sound: true,
  // Sfondo
  sfondo: 'legno' as Sfondo // (settings)
}

/**
 * Points multiplier per difficulty, applied to every point scored (cuts, bonuses, frenzy, completion).
 * Risk per second (launch rate × bug rate) is about 1 : 1.9 : 3.5 from facile to difficile; difficile
 * also has 30% more bubbles to cut, so ×3 is enough there.
 */
export const POINTS_MUL: Record<Difficulty, number> = { facile: 1, normale: 2, difficile: 3 }

export type Settings = {
  difficulty: Difficulty
  bugRule: BugRule
  sfondo: Sfondo
  soloGioco: boolean
}

export const TITLE_FONTS: Record<TitleFont, { family: string; google?: string }> = {
  'lilita one': { family: "'Lilita One', Nunito, sans-serif", google: 'Lilita+One' },
  'luckiest guy': { family: "'Luckiest Guy', Nunito, sans-serif", google: 'Luckiest+Guy' },
  'titan one': { family: "'Titan One', Nunito, sans-serif", google: 'Titan+One' },
  bungee: { family: "'Bungee', Nunito, sans-serif", google: 'Bungee' },
  'bowlby one': { family: "'Bowlby One', Nunito, sans-serif", google: 'Bowlby+One' },
  nunito: { family: 'Nunito, sans-serif' }
}

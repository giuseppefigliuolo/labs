// Design knobs. In the Claude Design prototype these were editor props;
// here they are build-time constants. Values marked "(settings)" are only the
// default: the player can override them from the Impostazioni panel. The rest
// (popup style and background included) are project config only.

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
  // Effetti
  sliceStyle: 'lucido' as SliceStyle,
  sliceSound: 'mela' as SliceSound,
  trail: true,
  bloom: 0.8, // 0..2
  aberration: 1, // 0..2
  // Audio
  sound: true,
  // Sfondo
  sfondo: 'legno' as Sfondo
}

export type Settings = {
  difficulty: Difficulty
  bugRule: BugRule
}

export const TITLE_FONTS: Record<TitleFont, { family: string; google?: string }> = {
  'lilita one': { family: "'Lilita One', Nunito, sans-serif", google: 'Lilita+One' },
  'luckiest guy': { family: "'Luckiest Guy', Nunito, sans-serif", google: 'Luckiest+Guy' },
  'titan one': { family: "'Titan One', Nunito, sans-serif", google: 'Titan+One' },
  bungee: { family: "'Bungee', Nunito, sans-serif", google: 'Bungee' },
  'bowlby one': { family: "'Bowlby One', Nunito, sans-serif", google: 'Bowlby+One' },
  nunito: { family: 'Nunito, sans-serif' }
}

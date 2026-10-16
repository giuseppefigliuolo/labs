import type { Engine } from '../game/Engine'

export type Actions = Pick<Engine, 'openSettings' | 'closeSettings' | 'openList' | 'closeList' | 'openFromList' | 'toggleMute' | 'restart' | 'continueGame' | 'openFromUI' | 'closePopup'>

import type { Engine } from '../game/Engine'

export type Actions = Pick<Engine, 'openSettings' | 'closeSettings' | 'toggleMute' | 'restart' | 'continueGame' | 'openFromUI' | 'closePopup'>

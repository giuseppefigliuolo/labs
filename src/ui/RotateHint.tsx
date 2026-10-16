import { useUI } from '../store'
import { PhonePortraitIcon } from './icons'
import { dismissRotate } from './orientation'

const COPY = {
  landscape: { text: 'Gira lo schermo in orizzontale per avere più spazio.', stay: 'Resta in verticale' },
  portrait: { text: 'Gira lo schermo in verticale.', stay: 'Resta in orizzontale' }
}

// Closed by dismissRotate or by the engine as soon as the viewport has the requested orientation.
export function RotateHint() {
  const to = useUI(s => s.rotateTo), c = COPY[to]
  return (
    <div data-ui="1" className="rotate-hint">
      <div className={'rotate-hint__icon rotate-hint__icon--' + to}><PhonePortraitIcon /></div>
      <div className="rotate-hint__title outlined">Ruota il telefono</div>
      <p className="rotate-hint__text">{c.text} Se la rotazione è bloccata, sbloccala dalle impostazioni rapide.</p>
      <button data-ui="1" className="btn-ghost" onClick={dismissRotate}>{c.stay}</button>
    </div>
  )
}

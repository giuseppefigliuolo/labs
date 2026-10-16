import { PhonePortraitIcon } from './icons'
import { dismissRotate } from './orientation'

// Closed by dismissRotate or by the engine as soon as the viewport turns landscape.
export function RotateHint() {
  return (
    <div data-ui="1" className="rotate-hint">
      <div className="rotate-hint__icon"><PhonePortraitIcon /></div>
      <div className="rotate-hint__title outlined">Ruota il telefono</div>
      <p className="rotate-hint__text">Gira lo schermo in orizzontale per avere più spazio. Se la rotazione è bloccata, sbloccala dalle impostazioni rapide.</p>
      <button data-ui="1" className="btn-ghost" onClick={dismissRotate}>Resta in verticale</button>
    </div>
  )
}

import { useUI } from '../store'

/**
 * HUD of the Bitrock-logo frenzy: veil, time bar and hit counter, plus a layer
 * for the "+1" / "+N" labels. The engine updates the bar, the number and the
 * labels directly through the data-frenzy hooks (every frame / every hit).
 */
export function Frenzy() {
  const on = useUI(s => s.frenzy)
  const op = on ? 1 : 0
  return (
    <div className="frenzy">
      <div className="frenzy__dim" style={{ opacity: op }} />
      <div className="frenzy__bar" style={{ opacity: op }}><div className="frenzy__fill" data-frenzy="fill" /></div>
      <div className="frenzy__count" style={{ opacity: op }}>
        <span className="frenzy__num" data-frenzy="num">0</span>
        <span className="eyebrow frenzy__lbl">tagli</span>
      </div>
      <div className="frenzy__fx" data-frenzy="fx" />
    </div>
  )
}

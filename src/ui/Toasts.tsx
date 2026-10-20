import { useShallow } from 'zustand/react/shallow'
import { POINTS_MUL } from '../config'
import { cfg, useUI } from '../store'

/** "Perfetto!", "Critico!" and "Combo ×n" labels (points scaled by difficulty) that pop at the slice position. */
export function Toasts() {
  // only the label fields: the full store changes on every hit (score, found…)
  const s = useUI(useShallow(u => ({ perfOn: u.perfOn, perfX: u.perfX, perfY: u.perfY, critOn: u.critOn, critX: u.critX, critY: u.critY, combo: u.combo, comboPts: u.comboPts, comboX: u.comboX, comboY: u.comboY, comboOn: u.comboOn })))
  const mul = useUI(u => POINTS_MUL[cfg('difficulty', u.settings)])
  return (
    <>
      <div className="float-anchor" style={{ left: s.perfX, top: s.perfY }}>
        <div className="perfect outlined" style={{ opacity: s.perfOn ? 1 : 0, transform: s.perfOn ? 'translateY(-16px) scale(1)' : 'translateY(0) scale(.6)' }}>
          Perfetto! +{2 * mul}
        </div>
      </div>
      <div className="float-anchor" style={{ left: s.critX, top: s.critY }}>
        <div className="perfect critical outlined" style={{ opacity: s.critOn ? 1 : 0, transform: s.critOn ? 'translateY(-16px) scale(1)' : 'translateY(0) scale(.6)' }}>
          Critico! +{3 * mul}
        </div>
      </div>
      <div className="float-anchor" style={{ left: s.comboX, top: s.comboY }}>
        <div className="combo" style={{ opacity: s.comboOn ? 1 : 0, transform: s.comboOn ? 'translateY(-20px) scale(1)' : 'translateY(0) scale(.6)' }}>
          <div className="combo__text outlined">{s.combo}</div>
          <div className="combo__pts outlined">{s.comboPts}</div>
        </div>
      </div>
    </>
  )
}

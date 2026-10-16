import { useUI } from '../store'

/** "Perfetto! +2" and "Combo ×n" labels that pop at the slice position. */
export function Toasts() {
  const s = useUI()
  return (
    <>
      <div className="float-anchor" style={{ left: s.perfX, top: s.perfY }}>
        <div className="perfect outlined" style={{ opacity: s.perfOn ? 1 : 0, transform: s.perfOn ? 'translateY(-16px) scale(1)' : 'translateY(0) scale(.6)' }}>
          Perfetto! +2
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

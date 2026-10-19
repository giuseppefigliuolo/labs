import { bitrockPng } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { GearIcon, LifeIcon, ListIcon } from './icons'

export function TopBar({ actions }: { actions: Actions }) {
  const phase = useUI(s => s.phase)
  const score = useUI(s => s.score)
  const best = useUI(s => s.best)
  const lives = useUI(s => s.lives)
  const complete = useUI(s => s.complete)
  const unlockedAll = useUI(s => s.unlockedAll)
  const showHud = phase === 'play' && !complete

  return (
    <div className="topbar">
      <div className="topbar__left">
        <div className="brand">
          <img src={bitrockPng} alt="Bitrock" />
          <div className="brand__name">Bitrock <span>Labs</span></div>
        </div>
        {showHud && (
          <div className="score">
            <div className="score__value outlined">{score}</div>
            <div className="score__best">Record {best}</div>
          </div>
        )}
      </div>
      <div className="topbar__right">
        <div className="icon-row">
          {unlockedAll && phase !== 'loading' && phase !== 'starting' && (
            <button data-ui="1" className="icon-btn" onClick={() => actions.openList(true)} aria-label="Tutti i progetti" title="Tutti i progetti">
              <ListIcon />
            </button>
          )}
          {phase !== 'loading' && (
            <button data-ui="1" className="icon-btn" onClick={actions.openSettings} aria-label="Impostazioni" title="Impostazioni">
              <GearIcon />
            </button>
          )}
        </div>
        {showHud && (
          <div className="lives" aria-label="Vite">
            {[0, 1, 2].map(i => {
              const lost = i < 3 - lives
              return (
                <div key={i} className="life" style={{ transform: lost ? 'scale(1.15)' : 'scale(1)' }}>
                  <LifeIcon color={lost ? '#ff4800' : 'rgba(255,255,255,0.3)'} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

import { CONFIG } from '../config'
import { asset } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { GearIcon, LifeIcon, SoundOffIcon, SoundOnIcon } from './icons'

export function TopBar({ actions }: { actions: Actions }) {
  const phase = useUI(s => s.phase)
  const score = useUI(s => s.score)
  const best = useUI(s => s.best)
  const lives = useUI(s => s.lives)
  const muted = useUI(s => s.muted)
  const showHud = phase === 'play' || phase === 'over'
  const muteLabel = muted ? 'Attiva audio' : 'Disattiva audio'

  return (
    <div className="topbar">
      <div className="topbar__left">
        <div className="brand">
          <img src={asset('bitrock.png')} alt="Bitrock" />
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
          {phase !== 'loading' && (
            <button data-ui="1" className="icon-btn" onClick={actions.openSettings} aria-label="Impostazioni" title="Impostazioni">
              <GearIcon />
            </button>
          )}
          {CONFIG.sound && (
            <button data-ui="1" className="icon-btn" onClick={actions.toggleMute} aria-label={muteLabel} title={muteLabel}>
              {muted ? <SoundOffIcon /> : <SoundOnIcon />}
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

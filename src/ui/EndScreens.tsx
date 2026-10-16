import type { CSSProperties } from 'react'
import { CTA_HREF, PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'

export function GameOver({ actions }: { actions: Actions }) {
  const score = useUI(s => s.score)
  const best = useUI(s => s.best)
  const newRecord = useUI(s => s.newRecord)
  const found = useUI(s => s.found)
  return (
    <div data-ui="1" className="screen screen--over">
      <div className="screen__body">
        <div className="stack gap-4">
          <div className="over__title outlined">Game over</div>
          <div className="over__score outlined">{score}</div>
          <div className={'over__record' + (newRecord ? ' is-new' : '')}>{newRecord ? 'Nuovo record!' : 'Record ' + best}</div>
        </div>
        <div className="stack gap-12">
          <div className="eyebrow dim">Progetti scoperti {found.length}/{PROJECTS.length}</div>
          <div className="chips">
            {PROJECTS.map(p => {
              const f = found.includes(p.id)
              return (
                <button key={p.id} data-ui="1" className={'over-chip' + (f ? ' is-found' : '')} onClick={e => { if (f) actions.openFromUI(p, e.clientX, e.clientY) }}>
                  {f ? p.name : '???'}
                </button>
              )
            })}
          </div>
        </div>
        <button data-ui="1" className="btn-primary" onClick={actions.restart}>Rigioca</button>
      </div>
    </div>
  )
}

export function Complete({ actions }: { actions: Actions }) {
  const found = useUI(s => s.found)
  return (
    <div data-ui="1" className="screen screen--complete">
      <div className="screen__body">
        <div className="stack gap-12">
          <div className="eyebrow complete__label">Progetti scoperti {found.length}/{PROJECTS.length}</div>
          <div className="complete__title outlined">Li hai trovati tutti</div>
          <div className="complete__bonus outlined">Bonus +10</div>
        </div>
        <div className="chips">
          {PROJECTS.map(p => (
            <span key={p.id} className="complete-chip" style={{ '--tint': p.tint } as CSSProperties}>{p.name}</span>
          ))}
        </div>
        <p className="complete__text">Ogni progetto di Labs è nato dalla curiosità di qualcuno del team. Se ti piace costruire cose così, parliamone.</p>
        <div className="actions">
          <a data-ui="1" className="btn-primary" href={CTA_HREF} target="_blank" rel="noopener">Lavora con noi</a>
          <button data-ui="1" className="btn-ghost" onClick={actions.continueGame}>Continua a giocare</button>
        </div>
      </div>
    </div>
  )
}

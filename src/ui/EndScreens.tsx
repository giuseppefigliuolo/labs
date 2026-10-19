import { useRef } from 'react'
import { CTA_HREF, PROJECTS } from '../data/projects'
import { useUI } from '../store'
import type { Actions } from './actions'
import { ProjectList } from './ProjectList'

function GameOverHalf({ half }: { half: 'top' | 'bot' }) {
  return (
    <div className={'over__half--' + half}>
      <span data-go-idle="1" className={'over__float over__float--' + half}>
        <span className={'over__cut over__cut--' + half}>
          <span className="over__emboss">
            <span className="over__body">Game over</span>
            <span className="over__face">Game over</span>
          </span>
        </span>
      </span>
    </div>
  )
}

// Embossed title cut in two by a blade (the same gesture the player makes on the bubbles).
function GameOverTitle() {
  return (
    <h2 className="over__title" aria-label="Game over">
      <div aria-hidden="true" data-go-idle="1" className="over__sway">
        <div className="over__drop">
          <div className="over__jolt">
            <GameOverHalf half="bot" />
            <GameOverHalf half="top" />
            {/* % coordinates, no viewBox: the blade isn't stretched, so pathLength matches the drawn length */}
            <svg className="over__blade">
              <line x1="-8%" y1="65.92%" x2="108%" y2="38.08%" pathLength={1} stroke="#ffffff" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1} />
            </svg>
            <span className="over__flash" />
            <span className="over__sparks"><i /><i /><i /><i /><i /><i /></span>
          </div>
        </div>
      </div>
    </h2>
  )
}

const X_PIECES = ['left', 'top', 'right', 'bot'] as const

// Same embossed title, this time hit by two blades crossing in an irregular X: four pieces.
function CompleteTitle() {
  const text = <>Li hai trovati<br />tutti</>
  return (
    <h2 className="over__title done__title" aria-label="Li hai trovati tutti">
      <div aria-hidden="true" data-go-idle="1" className="over__sway">
        <div className="over__drop">
          <div className="over__jolt done__jolt">
            {X_PIECES.map(p => (
              <div key={p} className={'done__piece--' + p}>
                <span data-go-idle="1" className={'done__float done__float--' + p}>
                  <span className={'done__cut done__cut--' + p}>
                    <span className="over__emboss">
                      <span className="over__body">{text}</span>
                      <span className="over__face">{text}</span>
                    </span>
                  </span>
                </span>
              </div>
            ))}
            <svg className="over__blade done__blade">
              <line x1="-7.36%" y1="-1.52%" x2="99.36%" y2="107.52%" pathLength={1} stroke="#ffffff" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1} />
              <line x1="89.12%" y1="-8%" x2="14.88%" y2="108%" pathLength={1} stroke="#ffffff" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1} />
            </svg>
            <span className="over__flash" />
            <span className="over__sparks"><i /><i /><i /><i /><i /><i /></span>
          </div>
        </div>
      </div>
    </h2>
  )
}

export function GameOver({ actions, leaving }: { actions: Actions; leaving?: boolean }) {
  const liveScore = useUI(s => s.score)
  const best = useUI(s => s.best)
  const liveRecord = useUI(s => s.newRecord)
  const found = useUI(s => s.found)
  // "Rigioca" resets score and record flag at once: keep showing the final ones while the screen fades out
  const kept = useRef({ score: liveScore, newRecord: liveRecord })
  if (!leaving) kept.current = { score: liveScore, newRecord: liveRecord }
  const { score, newRecord } = kept.current
  const missing = PROJECTS.length - found.length
  return (
    <div data-ui="1" className={'screen screen--over' + (leaving ? ' is-leaving' : '')}>
      <div className="screen__body">
        <div className="stack gap-4">
          <GameOverTitle />
          <div className="over__score outlined">{score}</div>
          <div className={'over__record' + (newRecord ? ' is-new' : '')}>{newRecord ? 'Nuovo record!' : 'Record ' + best}</div>
        </div>
        <div className="stack gap-12 screen__projects">
          <div className="label label--lg dim">Progetti scoperti {found.length}/{PROJECTS.length}</div>
          <ProjectList onOpen={actions.openFromUI} compact />
          {missing > 0 && (
            <p className="over__missing">
              {missing === 1 ? 'Ne manca 1: rigioca per scoprirlo.' : `Ne mancano ${missing}: rigioca per scoprirli.`}
            </p>
          )}
        </div>
        <button data-ui="1" className="btn-primary" onClick={actions.restart}>Rigioca</button>
      </div>
    </div>
  )
}

export function Complete({ actions, leaving }: { actions: Actions; leaving?: boolean }) {
  const found = useUI(s => s.found)
  return (
    <div data-ui="1" className={'screen screen--complete' + (leaving ? ' is-leaving' : '')}>
      <div className="screen__body">
        <div className="stack gap-12">
          <div className="label label--lg complete__label">Progetti scoperti {found.length}/{PROJECTS.length}</div>
          <CompleteTitle />
          <div className="complete__bonus outlined">Bonus +10</div>
        </div>
        <ProjectList onOpen={actions.openFromUI} mini all />
        <p className="complete__text">Ogni progetto di Labs è nato dalla curiosità di qualcuno del team. Se ti piace costruire cose così, parliamone.</p>
        <div className="actions">
          <a data-ui="1" className="btn-primary" href={CTA_HREF} target="_blank" rel="noopener">Lavora con noi</a>
          <button data-ui="1" className="btn-ghost" onClick={actions.continueGame}>Continua a giocare</button>
        </div>
      </div>
    </div>
  )
}

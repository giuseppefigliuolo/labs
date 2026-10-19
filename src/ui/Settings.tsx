import type { Settings as SettingsT } from '../config'
import { cfg, setSetting, useUI, type Orient } from '../store'
import type { Actions } from './actions'
import { CloseIcon } from './icons'
import { lockOrientation } from './orientation'

type Opt<V> = [value: V, label: string, desc?: string]

const DIFF: Opt<SettingsT['difficulty']>[] = [['facile', 'Facile'], ['normale', 'Normale'], ['difficile', 'Difficile']]
const DIFF_DESC: Record<SettingsT['difficulty'], string> = {
  facile: 'Meno bolle e meno bug: perfetto per esplorare i progetti con calma.',
  normale: 'Ritmo bilanciato tra progetti e bug.',
  difficile: 'Più bolle, più veloci e molti più bug.'
}
const BG: Opt<SettingsT['sfondo']>[] = [['legno', 'Legno'], ['griglia', 'Griglia'], ['punti', 'Punti'], ['orizzonte', 'Orizzonte'], ['carbonio', 'Carbonio'], ['ardesia', 'Ardesia'], ['minimale', 'Minimale']]
const ORIENT: Opt<Orient>[] = [['portrait', 'Verticale'], ['landscape', 'Orizzontale']]
const RULES: Opt<SettingsT['bugRule']>[] = [
  ['game over', 'Game over', 'Tagliare un bug chiude subito la partita.'],
  ['-1 vita', 'Perdi una vita', 'Tagliare un bug ti toglie una delle 3 vite, come quando lasci cadere un progetto.']
]

export function Settings({ actions, leaving }: { actions: Actions; leaving?: boolean }) {
  const settings = useUI(s => s.settings)
  const touch = useUI(s => s.touch)
  const portrait = useUI(s => s.portrait)
  const cur = <K extends keyof SettingsT>(k: K) => cfg(k, settings)
  const cls = (on: boolean, variant: string) => `opt opt--${variant}` + (on ? ' is-on' : '')

  return (
    <>
      <div data-ui="1" className={'scrim settings-scrim' + (leaving ? ' is-leaving' : '')} onClick={actions.closeSettings} />
      <div className="modal-stage">
        <div data-ui="1" className={'settings' + (leaving ? ' is-leaving' : '')} role="dialog" aria-label="Impostazioni">
          <div className="settings__head">
            <h2 className="settings__title">Impostazioni</h2>
            <button data-ui="1" className="close-btn settings__close" onClick={actions.closeSettings} aria-label="Chiudi">
              <CloseIcon color="#ffffff" width={2.4} />
            </button>
          </div>
          <div className="settings__body">
            <div className="settings__group">
              <div className="settings__label">Modalità</div>
              <button data-ui="1" role="switch" aria-checked={cur('soloGioco')} className={cls(cur('soloGioco'), 'toggle')} onClick={() => setSetting('soloGioco', !cur('soloGioco'))}>
                <span className="opt__copy">
                  <span className="opt__name">Solo gioco</span>
                  <span className="opt__desc">Niente popup dei progetti: tagli e continui a giocare senza interruzioni. Li ritrovi comunque nella lista dei progetti.</span>
                </span>
                <span className="opt__switch"><span /></span>
              </button>
            </div>
            <div className="settings__group">
              <div className="settings__label">Difficoltà</div>
              <div className="settings__grid">
                {DIFF.map(([v, label]) => (
                  <button key={v} data-ui="1" className={cls(cur('difficulty') === v, 'seg')} onClick={() => setSetting('difficulty', v)}>{label}</button>
                ))}
              </div>
              <div className="settings__text">{DIFF_DESC[cur('difficulty')]}</div>
            </div>
            <div className="settings__group">
              <div className="settings__label">Regola dei bug</div>
              <div className="settings__text">I bug sono le bolle scure con l’insetto rosso. Decidi cosa succede se ne tagli uno.</div>
              <div className="settings__rules">
                {RULES.map(([v, label, desc]) => (
                  <button key={v} data-ui="1" className={cls(cur('bugRule') === v, 'rule')} onClick={() => setSetting('bugRule', v)}>
                    <span className="opt__radio"><span /></span>
                    <span className="opt__copy">
                      <span className="opt__name">{label}</span>
                      <span className="opt__desc">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="settings__group">
              <div className="settings__label">Sfondo</div>
              <div className="settings__grid settings__grid--bg">
                {BG.map(([v, label]) => (
                  <button key={v} data-ui="1" className={cls(cur('sfondo') === v, 'seg')} onClick={() => setSetting('sfondo', v)}>{label}</button>
                ))}
              </div>
            </div>
            {touch && (
              <div className="settings__group">
                <div className="settings__label">Orientamento schermo</div>
                <div className="settings__grid settings__grid--2">
                  {ORIENT.map(([v, label]) => (
                    <button key={v} data-ui="1" className={cls(portrait === (v === 'portrait'), 'seg')} onClick={() => { actions.closeSettings(); lockOrientation(v) }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
            <button data-ui="1" className="settings__done" onClick={actions.closeSettings}>Fatto</button>
          </div>
        </div>
      </div>
    </>
  )
}

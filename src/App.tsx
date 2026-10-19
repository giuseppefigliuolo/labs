import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { CONFIG, TITLE_FONTS } from './config'
import { Engine } from './game/Engine'
import { cfg, useUI } from './store'
import type { Actions } from './ui/actions'
import { Background } from './ui/Background'
import { Complete, GameOver } from './ui/EndScreens'
import { Frenzy } from './ui/Frenzy'
import { Intro } from './ui/Intro'
import { RotateHint } from './ui/RotateHint'
import { ProjectPopup } from './ui/ProjectPopup'
import { ProjectSheet } from './ui/ProjectSheet'
import { usePresence } from './ui/presence'
import { Settings } from './ui/Settings'
import { Toasts } from './ui/Toasts'
import { TopBar } from './ui/TopBar'
import { Tray } from './ui/Tray'

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)
  const engine = useRef<Engine | null>(null)

  useEffect(() => {
    const e = engine.current = new Engine(rootRef.current!, mountRef.current!)
    e.start()
    return () => { e.dispose(); engine.current = null }
  }, [])

  const actions = useMemo<Actions>(() => ({
    openSettings: () => engine.current?.openSettings(),
    closeSettings: () => engine.current?.closeSettings(),
    openList: () => engine.current?.openList(),
    closeList: () => engine.current?.closeList(),
    openFromList: (p, x, y) => engine.current?.openFromList(p, x, y),
    toggleMute: () => engine.current?.toggleMute(),
    restart: () => engine.current?.restart(),
    continueGame: () => engine.current?.continueGame(),
    openFromUI: (p, x, y) => engine.current?.openFromUI(p, x, y),
    closePopup: () => engine.current?.closePopup()
  }), [])

  const phase = useUI(s => s.phase)
  const complete = useUI(s => s.complete)
  const settingsOpen = useUI(s => s.settingsOpen)
  const listOpen = useUI(s => s.listOpen)
  const sfondo = useUI(s => cfg('sfondo', s.settings))
  const popup = useUI(s => s.popup)
  const rotateHint = useUI(s => s.rotateHint)
  const flash = useUI(s => s.flash)
  const flashColor = useUI(s => s.flashColor)
  const flashT = useUI(s => s.flashT)
  // kept mounted a little after closing, to fade out instead of vanishing
  const introOn = usePresence(phase === 'intro')
  const overOn = usePresence(phase === 'over')
  const completeOn = usePresence(complete)
  const settingsOn = usePresence(settingsOpen)

  return (
    <div ref={rootRef} className="labs" data-screen-label="Labs" style={{ '--hf': TITLE_FONTS[CONFIG.titleFont].family } as CSSProperties}>
      <Background kind={sfondo} />
      <div ref={mountRef} className="fill" />
      <div className="flash" style={{ background: flashColor, opacity: flash, transition: flashT }} />

      <Frenzy />
      <TopBar actions={actions} />
      <Toasts />

      {phase === 'loading' && (
        <div className="loading">
          <svg className="loading__blade" width="240" height="90" viewBox="0 0 240 90" fill="none" strokeLinecap="round" aria-hidden="true">
            <path className="loading__glow" d="M14 76 L226 14" pathLength="1" strokeDasharray="1 1" stroke="#ff9a00" strokeWidth="7" />
            <path className="loading__edge" d="M14 76 L226 14" pathLength="1" strokeDasharray="1 1" stroke="#fff4e0" strokeWidth="2" />
          </svg>
          <div className="loading__text">Caricamento</div>
        </div>
      )}
      {introOn && <Intro leaving={phase !== 'intro'} />}
      {phase === 'play' && !complete && <Tray actions={actions} />}
      {overOn && <GameOver actions={actions} leaving={phase !== 'over'} />}
      {completeOn && <Complete actions={actions} leaving={!complete} />}
      {listOpen && <ProjectSheet actions={actions} />}
      {settingsOn && <Settings actions={actions} leaving={!settingsOpen} />}
      {popup && <ProjectPopup actions={actions} />}
      {rotateHint && <RotateHint />}
    </div>
  )
}

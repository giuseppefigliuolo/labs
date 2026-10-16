import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { CONFIG, TITLE_FONTS } from './config'
import { Engine } from './game/Engine'
import { useUI } from './store'
import type { Actions } from './ui/actions'
import { Background } from './ui/Background'
import { Complete, GameOver } from './ui/EndScreens'
import { Intro } from './ui/Intro'
import { RotateHint } from './ui/RotateHint'
import { ProjectPopup } from './ui/ProjectPopup'
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
    toggleMute: () => engine.current?.toggleMute(),
    restart: () => engine.current?.restart(),
    continueGame: () => engine.current?.continueGame(),
    openFromUI: (p, x, y) => engine.current?.openFromUI(p, x, y),
    closePopup: () => engine.current?.closePopup()
  }), [])

  const phase = useUI(s => s.phase)
  const complete = useUI(s => s.complete)
  const settingsOpen = useUI(s => s.settingsOpen)
  const popup = useUI(s => s.popup)
  const rotateHint = useUI(s => s.rotateHint)
  const flash = useUI(s => s.flash)
  const flashColor = useUI(s => s.flashColor)
  const flashT = useUI(s => s.flashT)

  return (
    <div ref={rootRef} className="labs" data-screen-label="Labs" style={{ '--hf': TITLE_FONTS[CONFIG.titleFont].family } as CSSProperties}>
      <Background kind={CONFIG.sfondo} />
      <div ref={mountRef} className="fill" />
      <div className="flash" style={{ background: flashColor, opacity: flash, transition: flashT }} />

      <TopBar actions={actions} />
      <Toasts />

      {phase === 'loading' && <div className="loading">Caricamento</div>}
      {phase === 'intro' && <Intro />}
      {phase === 'play' && !complete && <Tray actions={actions} />}
      {phase === 'over' && <GameOver actions={actions} />}
      {complete && <Complete actions={actions} />}
      {settingsOpen && <Settings actions={actions} />}
      {popup && <ProjectPopup actions={actions} />}
      {rotateHint && <RotateHint />}
    </div>
  )
}

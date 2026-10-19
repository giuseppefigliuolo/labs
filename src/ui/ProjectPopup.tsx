import type { CSSProperties, ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { CTA_HREF, PROJECTS, type Project } from '../data/projects'
import { CONFIG } from '../config'
import { useUI, type UIState } from '../store'
import type { Actions } from './actions'
import { ArrowIcon, CloseIcon } from './icons'

type PopState = Pick<UIState, 'popup' | 'popupShown' | 'anim' | 'side' | 'ox' | 'oy' | 'origin' | 'ptint' | 'backLabel'>

/** Entry/exit transform for the card, matching CONFIG.zoomStyle. */
function popVals(s: PopState) {
  const A = s.anim, sh = s.popupShown, side = s.side, ox = s.ox, oy = s.oy
  let tf: string, flt = 'blur(0px)', org = s.origin, tr: string
  if (A === 'swing') { tf = sh ? 'perspective(1400px) scale(1) rotateY(0deg) rotateZ(0deg)' : `perspective(1400px) scale(0.12) rotateY(${-side * 55}deg) rotateZ(${side * 10}deg)`; tr = 'transform .95s cubic-bezier(.16,1,.3,1), opacity .5s cubic-bezier(.16,1,.3,1)' }
  else if (A === 'blur') { tf = sh ? 'scale(1)' : 'scale(0.25)'; flt = sh ? 'blur(0px)' : 'blur(16px)'; tr = 'transform .85s cubic-bezier(.16,1,.3,1), opacity .5s ease, filter .7s ease' }
  else if (A === 'portal') { tf = sh ? 'translateY(0px) scale(1)' : 'translateY(48px) scale(0.94)'; org = '50% 50%'; tr = sh ? 'transform .8s cubic-bezier(.16,1,.3,1) .38s, opacity .5s ease .38s' : 'transform .3s cubic-bezier(.4,0,1,1), opacity .22s ease' }
  else if (A === 'tilt') { tf = sh ? 'perspective(1200px) translateY(0px) rotateX(0deg) scale(1)' : 'perspective(1200px) translateY(60vh) rotateX(70deg) scale(0.7)'; org = '50% 100%'; tr = 'transform 1s cubic-bezier(.16,1,.3,1), opacity .45s ease' }
  else { tf = sh ? 'scale(1)' : 'scale(0.15)'; tr = 'transform .75s cubic-bezier(.16,1,.3,1), opacity .5s cubic-bezier(.16,1,.3,1)' }
  const R = Math.round(Math.hypot(window.innerWidth || 1200, window.innerHeight || 900) * 1.05), open = sh && A === 'portal', tint = s.ptint
  const clip = `circle(${open ? R : 0}px at ${ox}px ${oy}px)`
  return {
    stage: { transform: tf, opacity: sh ? 1 : 0, transformOrigin: org, filter: flt, transition: tr } satisfies CSSProperties,
    portal: {
      background: `radial-gradient(circle at ${ox}px ${oy}px, ${tint} 0%, ${tint} 28%, #3a1a0a 110%)`,
      clipPath: clip, WebkitClipPath: clip,
      transition: open ? 'clip-path .8s cubic-bezier(.65,0,.15,1), -webkit-clip-path .8s cubic-bezier(.65,0,.15,1)' : 'clip-path .55s cubic-bezier(.7,0,.84,0) .12s, -webkit-clip-path .55s cubic-bezier(.7,0,.84,0) .12s'
    } satisfies CSSProperties
  }
}

type CardProps = { p: Project; close: () => void; backLabel: string }

const Logo = ({ p }: { p: Project }) =>
  p.logo
    ? <div role="img" aria-label={p.name} className="pop-logo" style={{ backgroundImage: `url("${p.logo}")` }} />
    : <div className="pop-word" style={{ '--accent': p.accent || '#ff6a00' } as CSSProperties}>{p.word}<span /></div>

const Close = ({ close, color = '#ffffff', width }: { close: () => void; color?: string; width?: number }) => (
  <button data-ui="1" className="close-btn pop-close" onClick={close} aria-label="Chiudi"><CloseIcon color={color} width={width} /></button>
)

const Ctas = ({ p, center, arrow }: { p: Project; center?: boolean; arrow?: number }) => (
  <div className="pop-ctas" style={{ justifyContent: center || !p.link ? 'center' : 'flex-start' }}>
    <a data-ui="1" className="pop-cta" href={CTA_HREF} target="_blank" rel="noopener">Parliamone</a>
    {p.link && <a data-ui="1" className="pop-link" href={p.link} target="_blank" rel="noopener">{p.linkLabel}<ArrowIcon width={arrow} /></a>}
  </div>
)

const Stack = ({ p }: { p: Project }) => (
  <div className="pop-section">
    <div className="eyebrow pop-stack-label">{p.stackLabel || 'Stack'}</div>
    <div className="pop-chips">{p.stack.map(s => <span key={s} className="pop-chip">{s}</span>)}</div>
  </div>
)

const Back = ({ close, label }: { close: () => void; label: string }) => (
  <button data-ui="1" className="pop-back" onClick={close}>{label}</button>
)

function Essenziale({ p, close, backLabel }: CardProps) {
  return (
    <div data-ui="1" className="pop-card pop-essenziale">
      <Close close={close} color="#303030" width={2} />
      <div className="pop-hero"><Logo p={p} /></div>
      <div className="pop-body">
        <div className="pop-head">
          <div className="eyebrow pop-eyebrow">{p.eyebrow}</div>
          <h2 className="pop-name">{p.name}</h2>
        </div>
        <p className="pop-desc">{p.desc}</p>
        <Stack p={p} />
        <Ctas p={p} arrow={2} />
        <Back close={close} label={backLabel} />
      </div>
    </div>
  )
}

function Arcade({ p, close, backLabel }: CardProps) {
  return (
    <div data-ui="1" className="pop-card pop-arcade">
      <Close close={close} color="#1a0d05" />
      <div className="pop-hero"><div className="pop-plate"><Logo p={p} /></div></div>
      <div className="pop-body">
        <div className="pop-head">
          <div className="eyebrow pop-eyebrow">{p.eyebrow}</div>
          <h2 className="pop-name">{p.name}</h2>
        </div>
        <p className="pop-desc">{p.desc}</p>
        <Stack p={p} />
        <Ctas p={p} />
        <Back close={close} label={backLabel} />
      </div>
    </div>
  )
}

function Vetro({ p, close, backLabel }: CardProps) {
  return (
    <div data-ui="1" className="pop-card pop-vetro">
      <Close close={close} />
      <div className="pop-hero">
        <div className="pop-plate"><Logo p={p} /></div>
        <div className="pop-hero-line" />
      </div>
      <div className="pop-body">
        <div className="pop-head">
          <div className="eyebrow pop-eyebrow">{p.eyebrow}</div>
          <h2 className="pop-name">{p.name}</h2>
        </div>
        <p className="pop-desc">{p.desc}</p>
        <div className="pop-rule" />
        <Stack p={p} />
        <Ctas p={p} />
        <Back close={close} label={backLabel} />
      </div>
    </div>
  )
}

function Carta({ p, close, backLabel }: CardProps) {
  const idx = PROJECTS.findIndex(x => x.id === p.id)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div data-ui="1" className="pop-card pop-carta">
      <div className="pop-top">
        <div className="pop-series">
          <span>Labs</span>
          {idx >= 0 && <span>N° {pad(idx + 1)}/{pad(PROJECTS.length)}</span>}
        </div>
        <Close close={close} />
      </div>
      <div className="pop-sheet">
        <div className="pop-hero">
          <div className="pop-stamp">Scoperto</div>
          <div className="pop-plate"><Logo p={p} /></div>
        </div>
        <div className="pop-banner"><h2 className="pop-name">{p.name}</h2></div>
        <div className="pop-body">
          <div className="eyebrow pop-eyebrow">{p.eyebrow}</div>
          <p className="pop-desc">{p.desc}</p>
          <div className="pop-chips">{p.stack.map(s => <span key={s} className="pop-chip">{s}</span>)}</div>
          <Ctas p={p} center />
        </div>
      </div>
      <Back close={close} label={backLabel} />
    </div>
  )
}

const CARDS = { attuale: Essenziale, arcade: Arcade, vetro: Vetro, carta: Carta }

export function ProjectPopup({ actions }: { actions: Actions }) {
  // only the popup's fields: the store also changes on every hit (score, toasts…) behind it
  const s = useUI(useShallow((u): PopState => ({
    popup: u.popup, popupShown: u.popupShown, anim: u.anim, side: u.side, ox: u.ox, oy: u.oy, origin: u.origin, ptint: u.ptint, backLabel: u.backLabel
  })))
  const p = s.popup
  if (!p) return null
  const v = popVals(s)
  const tint = p.tint || '#ff9a00'
  const Card = CARDS[CONFIG.popupStyle]
  const card: ReactNode = <Card p={p} close={actions.closePopup} backLabel={s.backLabel} />
  return (
    <>
      <div data-ui="1" className="scrim pop-scrim" onClick={actions.closePopup} style={{ opacity: s.popupShown ? 1 : 0 }} />
      <div data-ui="1" className="pop-portal" onClick={actions.closePopup} style={v.portal} />
      <div className="modal-stage" style={{ ...v.stage, '--tint': tint, '--tint-glow': tint + '66' } as CSSProperties}>
        {card}
      </div>
    </>
  )
}

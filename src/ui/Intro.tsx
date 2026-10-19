import type { CSSProperties } from 'react'
import { useUI } from '../store'
import { PhoneLandscapeIcon } from './icons'
import { goLandscape } from './orientation'

// The engine measures [data-intro-text] and [data-intro-hint] to fit the
// "gioca" bubble in the gap between them, so keep both as direct children.
export function Intro({ leaving }: { leaving?: boolean }) {
  const showRotate = useUI(s => s.touch && s.portrait)
  return (
    <div className={'intro' + (leaving ? ' is-leaving' : '')}>
      <h1 className="intro__title" aria-label="Labs">
        <span className="intro__word" aria-hidden="true">
          {[...'Labs'].map((ch, i) => (
            <span key={i} className="intro__letter" style={{ '--i': i } as CSSProperties}>
              <span className="intro__float">
                <span className="intro__tube">{ch}</span>
                <span className="intro__core">{ch}</span>
              </span>
            </span>
          ))}
        </span>
      </h1>
      <p data-intro-text="1" className="intro__text">I progetti nati in Bitrock, da prendere al volo. Tagliali per scoprirli ed evita i bug.</p>
      <div className="intro__spacer" />
      <div data-intro-hint="1" className="intro__hint">
        <div className="intro__swipe" />
        <div className="intro__cta">Taglia la bolla per iniziare</div>
        {showRotate && (
          <button data-ui="1" className="intro__rotate" onClick={goLandscape}>
            <PhoneLandscapeIcon />Gioca in orizzontale
          </button>
        )}
      </div>
    </div>
  )
}

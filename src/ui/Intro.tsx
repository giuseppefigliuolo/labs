// The engine measures [data-intro-text] and [data-intro-hint] to fit the
// "gioca" bubble in the gap between them, so keep both as direct children.
export function Intro() {
  return (
    <div className="intro">
      <h1 className="intro__title outlined">Labs</h1>
      <p data-intro-text="1" className="intro__text">I progetti nati in Bitrock, da prendere al volo. Tagliali per scoprirli ed evita i bug.</p>
      <div className="intro__spacer" />
      <div data-intro-hint="1" className="intro__hint">
        <div className="intro__swipe" />
        <div className="intro__cta">Taglia la bolla per iniziare</div>
      </div>
    </div>
  )
}

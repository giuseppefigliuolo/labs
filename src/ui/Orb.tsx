import type { CSSProperties } from 'react'
import type { Project } from '../data/projects'

/** Small CSS bubble in the project's tint with its bubble logo inside (initial when it has none). */
export function Orb({ p, className }: { p: Project; className?: string }) {
  return (
    <span className={'orb' + (className ? ' ' + className : '')} style={{ '--tint': p.tint } as CSSProperties}>
      {p.texSrc ? <span className="orb__logo" style={{ backgroundImage: `url("${p.texSrc}")` }} /> : p.name[0]}
    </span>
  )
}

import type { Sfondo } from '../config'

/** "legno" is painted by the root itself; the others are layered on top. */
export function Background({ kind }: { kind: Sfondo }) {
  if (kind === 'legno') return null
  if (kind === 'orizzonte') {
    return (
      <div className="bg bg--orizzonte">
        <div className="bg__floor" />
        <div className="bg__horizon" />
      </div>
    )
  }
  return <div className={`bg bg--${kind}`} />
}

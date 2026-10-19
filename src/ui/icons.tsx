const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...line}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...line}>
    <path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" />
  </svg>
)

export const CloseIcon = ({ color, width = 2.6 }: { color: string; width?: number }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
)

export const ArrowIcon = ({ width = 2.4 }: { width?: number }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...line} strokeWidth={width}>
    <path d="M7 7h10v10" /><path d="M7 17 17 7" />
  </svg>
)

export const LifeIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" strokeLinecap="round">
    <path d="M5 5 19 19M19 5 5 19" stroke="#1a0d05" strokeWidth="7" />
    <path d="M5 5 19 19M19 5 5 19" stroke={color} strokeWidth="3.5" />
  </svg>
)

export const PhoneLandscapeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...line}>
    <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M18 12h.01" />
  </svg>
)

export const PhonePortraitIcon = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" {...line} strokeWidth={1.8}>
    <rect x="6" y="2" width="12" height="20" rx="2" /><path d="M12 18h.01" />
  </svg>
)

export const ChevronUpIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...line}><path d="m18 15-6-6-6 6" /></svg>
)

export const ChevronRightIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...line}><path d="m9 18 6-6-6-6" /></svg>
)

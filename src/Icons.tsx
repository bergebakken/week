export function Check({ done = false, color = 'currentColor', size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" style={{ flex: '0 0 auto', marginTop: 1 }}>
      <rect x="1" y="1" width="11" height="11" rx="2" stroke={color} strokeWidth="1.2" />
      {done && (
        <path d="M3.6 6.6 5.5 8.5 9.4 4.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

export function Close({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" />
    </svg>
  )
}

export function Spark({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <path d="M6 1.5v2M6 8.5v2M1.5 6h2M8.5 6h2M2.8 2.8l1.4 1.4M7.8 7.8l1.4 1.4M9.2 2.8 7.8 4.2M4.2 7.8 2.8 9.2" />
    </svg>
  )
}

export function Gear({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.2v2.1M10 15.7v2.1M2.2 10h2.1M15.7 10h2.1M4.5 4.5 6 6M14 14l1.5 1.5M15.5 4.5 14 6M6 14l-1.5 1.5" />
    </svg>
  )
}

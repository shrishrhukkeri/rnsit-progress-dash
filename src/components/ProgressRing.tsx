import { ringStroke } from '../lib/progress'

type Props = {
  percent: number
  size?: number
  stroke?: number
  className?: string
  showDrop?: boolean
}

export function ProgressRing({
  percent,
  size = 260,
  stroke = 10,
  className,
  showDrop = false,
}: Props) {
  const radius = (size - stroke * 2) / 2
  const { c, offset } = ringStroke(percent, radius, stroke)
  const center = size / 2
  const angle = (percent / 100) * 360 - 90
  const rad = (angle * Math.PI) / 180
  const dropX = center + radius * Math.cos(rad)
  const dropY = center + radius * Math.sin(rad)

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={stroke}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ filter: 'drop-shadow(0 0 8px var(--accent-glow))' }}
      />
      {showDrop && percent > 0 && (
        <circle cx={dropX} cy={dropY} r={7} fill="var(--accent)" />
      )}
    </svg>
  )
}

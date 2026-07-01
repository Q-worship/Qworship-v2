interface BeamWedge {
  startDeg: number
  endDeg: number
  color: string
  opacity: number
  driftDelay?: number
}

const ORIGIN_X = 50
const ORIGIN_Y = 100
const BEAM_LENGTH = 96

// Fan from upper-left to upper-right, radiating from bottom-center
const BEAMS: BeamWedge[] = [
  { startDeg: 244, endDeg: 247, color: '#d97706', opacity: 0.78 },
  { startDeg: 247, endDeg: 250, color: '#f59e0b', opacity: 0.74, driftDelay: 1.1 },
  { startDeg: 250, endDeg: 253, color: '#ea580c', opacity: 0.72, driftDelay: 2.2 },
  { startDeg: 253, endDeg: 256, color: '#b45309', opacity: 0.7, driftDelay: 0.5 },
  { startDeg: 256, endDeg: 259, color: '#fbbf24', opacity: 0.68, driftDelay: 1.7 },
  { startDeg: 259, endDeg: 262, color: '#d97706', opacity: 0.72 },
  { startDeg: 262, endDeg: 265, color: '#f59e0b', opacity: 0.7, driftDelay: 1.4 },
  { startDeg: 265, endDeg: 268, color: '#92400e', opacity: 0.68, driftDelay: 0.8 },
  { startDeg: 268, endDeg: 271, color: '#f59e0b', opacity: 0.66, driftDelay: 2.5 },
  { startDeg: 271, endDeg: 274, color: '#1e3a5f', opacity: 0.7 },
  { startDeg: 274, endDeg: 277, color: '#d97706', opacity: 0.66, driftDelay: 1.3 },
  { startDeg: 277, endDeg: 280, color: '#0891b2', opacity: 0.64, driftDelay: 2.0 },
  { startDeg: 280, endDeg: 283, color: '#06b6d4', opacity: 0.7, driftDelay: 1.2 },
  { startDeg: 283, endDeg: 286, color: '#22d3ee', opacity: 0.68, driftDelay: 2.1 },
  { startDeg: 286, endDeg: 289, color: '#0e7490', opacity: 0.64, driftDelay: 0.6 },
  { startDeg: 289, endDeg: 292, color: '#67e8f9', opacity: 0.62, driftDelay: 1.8 },
  { startDeg: 292, endDeg: 295, color: '#0891b2', opacity: 0.6, driftDelay: 2.6 },
  { startDeg: 295, endDeg: 298, color: '#06b6d4', opacity: 0.58, driftDelay: 0.9 },
]

function polarToXY(deg: number, length: number): [number, number] {
  const rad = (deg * Math.PI) / 180
  return [ORIGIN_X + length * Math.cos(rad), ORIGIN_Y + length * Math.sin(rad)]
}

function wedgePoints(startDeg: number, endDeg: number): string {
  const [x1, y1] = polarToXY(startDeg, BEAM_LENGTH)
  const [x2, y2] = polarToXY(endDeg, BEAM_LENGTH)
  return `${ORIGIN_X},${ORIGIN_Y} ${x1},${y1} ${x2},${y2}`
}

export function HandsFreeBeamAnimation() {
  return (
    <div className="hfb-beam-animation" aria-hidden>
      <svg
        className="hfb-beam-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hfb-focal-glow" cx="50%" cy="100%" r="55%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.65" />
            <stop offset="35%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#050208" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill="#050208" />

        <g className="hfb-beam-group">
          {BEAMS.map((beam, index) => (
            <polygon
              key={index}
              className="hfb-beam-wedge"
              points={wedgePoints(beam.startDeg, beam.endDeg)}
              fill={beam.color}
              opacity={beam.opacity}
              style={
                beam.driftDelay !== undefined
                  ? { animationDelay: `${beam.driftDelay}s` }
                  : undefined
              }
            />
          ))}
        </g>

        <ellipse cx="50" cy="100" rx="28" ry="18" fill="url(#hfb-focal-glow)" />
      </svg>
    </div>
  )
}

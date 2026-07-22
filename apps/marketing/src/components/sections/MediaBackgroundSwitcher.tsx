import { useEffect, useRef, useState } from 'react'

const STATES = [
  { img: '/Photos/media/state-1.png', label: 'Background option 1' },
  { img: '/Photos/media/state-2.png', label: 'Background option 2' },
  { img: '/Photos/media/state-3.png', label: 'Background option 3' },
  { img: '/Photos/media/state-4.png', label: 'Background option 4' },
]

const THUMB_POSITIONS = [
  { x: 0.135, y: 0.845 },
  { x: 0.355, y: 0.845 },
  { x: 0.575, y: 0.845 },
  { x: 0.795, y: 0.845 },
]

const HOVER_PAUSE = 900
const CLICK_DURATION = 250
const HOLD_TIME = 2000
const FADE_TIME = 500

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function MediaBackgroundSwitcher() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [prevIdx, setPrevIdx] = useState<number | null>(null)
  const [fading, setFading] = useState(false)
  const [cursorX, setCursorX] = useState(THUMB_POSITIONS[0].x)
  const [cursorY, setCursorY] = useState(THUMB_POSITIONS[0].y)
  const [clicking, setClicking] = useState(false)
  const [started, setStarted] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)

    const handleChange = () => setReduceMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (reduceMotion) return

    const timeout = window.setTimeout(() => setStarted(true), 800)
    return () => window.clearTimeout(timeout)
  }, [reduceMotion])

  useEffect(() => {
    if (!started || reduceMotion) return

    cancelRef.current = false

    const run = async () => {
      while (!cancelRef.current) {
        for (let i = 0; i < STATES.length; i += 1) {
          if (cancelRef.current) return

          setCursorX(THUMB_POSITIONS[i].x)
          setCursorY(THUMB_POSITIONS[i].y)
          await delay(HOVER_PAUSE)
          if (cancelRef.current) return

          setClicking(true)
          await delay(CLICK_DURATION)
          if (cancelRef.current) return
          setClicking(false)

          setPrevIdx(i === 0 ? STATES.length - 1 : i - 1)
          setFading(true)
          setActiveIdx(i)
          await delay(FADE_TIME)
          if (cancelRef.current) return
          setFading(false)
          setPrevIdx(null)

          await delay(HOLD_TIME)
          if (cancelRef.current) return
        }
      }
    }

    run()
    return () => {
      cancelRef.current = true
    }
  }, [started, reduceMotion])

  return (
    <div
      className="media-background-switcher"
      role="img"
      aria-label="Media library background picker with Matthew 8:20 verse preview"
    >
      <div className="media-background-switcher__frame">
        {prevIdx !== null && (
          <img
            src={STATES[prevIdx].img}
            alt=""
            aria-hidden
            className="media-background-switcher__image media-background-switcher__image--previous"
            style={{
              opacity: fading ? 0 : 1,
              transition: `opacity ${FADE_TIME}ms ease`,
            }}
            draggable={false}
          />
        )}

        <img
          src={STATES[activeIdx].img}
          alt={STATES[activeIdx].label}
          className="media-background-switcher__image media-background-switcher__image--active"
          draggable={false}
        />

        {started && !reduceMotion && (
          <div
            className={`media-background-switcher__cursor${clicking ? ' media-background-switcher__cursor--clicking' : ''}`}
            style={{
              left: `${cursorX * 100}%`,
              top: `${cursorY * 100}%`,
              transition: `left ${HOVER_PAUSE * 0.65}ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                top ${HOVER_PAUSE * 0.65}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            }}
          >
            <svg
              width="20"
              height="24"
              viewBox="0 0 20 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="media-background-switcher__cursor-icon"
              aria-hidden
            >
              <path
                d="M2 1.5L2 18L6 13.5L8.8 20L11 19L8.2 12.5H14L2 1.5Z"
                fill="white"
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>

            {clicking && <span className="media-background-switcher__cursor-ripple" aria-hidden />}
          </div>
        )}
      </div>
    </div>
  )
}

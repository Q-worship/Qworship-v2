import { useState, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { images } from '@/lib/theme'

const VERSES = [
  {
    ref: 'MATT 7 : 7',
    translation: 'KJV',
    text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.',
  },
  {
    ref: 'MATT 7 : 8',
    translation: 'KJV',
    text: 'For every one that asketh receiveth; and he that seeketh findeth; and to him that knocketh it shall be opened.',
  },
  {
    ref: 'MATT 7 : 7',
    translation: 'NKJV',
    text: 'Ask, and it will be given to you; seek, and you will find; knock, and it will be opened to you.',
  },
]

const COMMANDS = [
  { id: 'next', label: 'Lets see the next verse', highlight: null, icon: 'forward', action: 'next', isThankYou: false },
  { id: 'prev', label: 'Lets see the previous verse', highlight: null, icon: 'backward', action: 'prev', isThankYou: false },
  { id: 'nkjv', label: 'Show me the', highlight: 'NKJV', icon: 'tv', action: 'nkjv', isThankYou: false },
  { id: 'thanks', label: 'Thank You', highlight: null, icon: 'x', action: 'clear', isThankYou: true },
]

const LISTENING_PHRASES = [
  { prefix: 'Lets open our Bibles to the book of ', highlight: 'Matthew 7 verse 7', suffix: ' where....' },
  { prefix: 'Now lets see the ', highlight: 'next verse', suffix: ' in Matthew...' },
  { prefix: 'Switching to the ', highlight: 'NKJV', suffix: ' translation...' },
  { prefix: 'Say ', highlight: 'Thank You', suffix: ' to dismiss the verse...' },
]

const AUTO_SEQUENCE = ['next', 'prev', 'nkjv', 'thanks'] as const
const WAVEFORM_HEIGHTS = [3, 6, 9, 12, 8, 14, 10, 6, 11, 7, 13, 5, 9, 12, 8, 6, 10, 7, 4, 8]

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="hfb-animation__waveform" aria-hidden>
      {WAVEFORM_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`hfb-animation__waveform-bar${active ? ' hfb-animation__waveform-bar--active' : ''}`}
          style={
            {
              '--bar-height': `${h}px`,
              '--bar-delay': `${i * 0.04}s`,
              '--bar-duration': `${0.5 + (i % 5) * 0.1}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

function CommandIcon({ type, isThankYou }: { type: string; isThankYou?: boolean }) {
  return (
    <div
      className={`hfb-animation__cmd-icon${isThankYou ? ' hfb-animation__cmd-icon--thanks' : ''}`}
      aria-hidden
    >
      {type === 'forward' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M5.5 5L13 12L5.5 19V5ZM13 5L20.5 12L13 19V5Z" />
        </svg>
      )}
      {type === 'backward' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M18.5 5L11 12L18.5 19V5ZM11 5L3.5 12L11 19V5Z" />
        </svg>
      )}
      {type === 'tv' && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )}
      {type === 'x' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" strokeWidth="3" stroke="white">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      )}
    </div>
  )
}

interface HandsFreeBibleAnimationProps {
  className?: string
}

export function HandsFreeBibleAnimation({ className = '' }: HandsFreeBibleAnimationProps) {
  const [verseIdx, setVerseIdx] = useState(0)
  const [cleared, setCleared] = useState(false)
  const [activeCmd, setActiveCmd] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [listeningText, setListeningText] = useState(0)
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeCmdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSeqRef = useRef(0)
  const isTransitioningRef = useRef(false)

  const triggerCommand = useCallback((action: string, cmdId: string) => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    setActiveCmd(cmdId)
    setIsTransitioning(true)

    if (transitionRef.current) clearTimeout(transitionRef.current)
    transitionRef.current = setTimeout(() => {
      if (action === 'next') {
        setCleared(false)
        setVerseIdx((i) => (i + 1) % 2)
      } else if (action === 'prev') {
        setCleared(false)
        setVerseIdx((i) => (i === 0 ? 1 : 0))
      } else if (action === 'nkjv') {
        setCleared(false)
        setVerseIdx(2)
      } else if (action === 'clear') {
        setCleared(true)
      }
      isTransitioningRef.current = false
      setIsTransitioning(false)
    }, 350)

    if (activeCmdRef.current) clearTimeout(activeCmdRef.current)
    activeCmdRef.current = setTimeout(() => setActiveCmd(null), 1200)
  }, [])

  const clearAutoTimer = useCallback(() => {
    if (autoRef.current) {
      clearTimeout(autoRef.current)
      autoRef.current = null
    }
  }, [])

  const handleCommandClick = useCallback(
    (cmdId: string, action: string) => {
      clearAutoTimer()
      setListeningText(COMMANDS.findIndex((c) => c.id === cmdId))
      triggerCommand(action, cmdId)
    },
    [clearAutoTimer, triggerCommand],
  )

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const schedule = () => {
      autoRef.current = setTimeout(() => {
        const seq = AUTO_SEQUENCE[autoSeqRef.current % AUTO_SEQUENCE.length]
        const cmd = COMMANDS.find((c) => c.id === seq)!
        setListeningText(autoSeqRef.current % LISTENING_PHRASES.length)
        triggerCommand(cmd.action, cmd.id)
        autoSeqRef.current++

        if (cmd.action === 'clear') {
          if (resetRef.current) clearTimeout(resetRef.current)
          resetRef.current = setTimeout(() => {
            setCleared(false)
            setVerseIdx(0)
            autoSeqRef.current = 0
          }, 3000)
        }

        schedule()
      }, 4000)
    }

    schedule()

    return () => {
      clearAutoTimer()
      if (resetRef.current) clearTimeout(resetRef.current)
      if (activeCmdRef.current) clearTimeout(activeCmdRef.current)
      if (transitionRef.current) clearTimeout(transitionRef.current)
    }
  }, [clearAutoTimer, triggerCommand])

  const verse = VERSES[verseIdx]
  const phrase = LISTENING_PHRASES[listeningText]

  return (
    <div className={`hfb-animation ${className}`.trim()}>
      <div className="hfb-animation__demo">
        <div className="hfb-animation__stage">
          <img
            src={images.handsFreeStage}
            alt="Pastor preaching on stage"
            className="hfb-animation__stage-image"
          />

          <div
            className={`hfb-animation__scripture${cleared ? ' hfb-animation__scripture--hidden' : ''}`}
          >
            <div className="hfb-animation__scripture-panel">
              <div className="hfb-animation__scripture-header">
                <span
                  className={`hfb-animation__scripture-ref${isTransitioning ? ' hfb-animation__scripture-ref--transitioning' : ''}`}
                >
                  {verse.ref}
                </span>
                <span
                  className={`hfb-animation__scripture-translation${isTransitioning ? ' hfb-animation__scripture-ref--transitioning' : ''}`}
                >
                  {verse.translation}
                </span>
              </div>
              <div className="hfb-animation__scripture-divider" />
              <p
                className={`hfb-animation__scripture-text${isTransitioning ? ' hfb-animation__scripture-text--transitioning' : ''}`}
              >
                {verse.text}
              </p>
            </div>
          </div>

          {cleared && (
            <div className="hfb-animation__cleared">
              <span className="hfb-animation__cleared-label">Scripture dismissed</span>
            </div>
          )}
        </div>

        <div className="hfb-animation__panel">
          <div className="hfb-animation__listening-header">
            <div className="hfb-animation__mic-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0014 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </div>
            <span className="hfb-animation__listening-label">Listening</span>
            <WaveformBars active />
          </div>

          <div className="hfb-animation__transcription">
            {phrase.prefix}
            <span className="hfb-animation__transcription-highlight">{phrase.highlight}</span>
            {phrase.suffix}
          </div>

          <div className="hfb-animation__commands">
            {COMMANDS.map((cmd) => {
              const isActive = activeCmd === cmd.id
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => handleCommandClick(cmd.id, cmd.action)}
                  className={`hfb-animation__command${isActive ? ' hfb-animation__command--active' : ''}`}
                >
                  <WaveformBars active={isActive} />
                  <span
                    className={`hfb-animation__command-label${cmd.isThankYou ? ' hfb-animation__command-label--thanks' : ''}${isActive ? ' hfb-animation__command-label--active' : ''}`}
                  >
                    {cmd.highlight ? (
                      <>
                        {cmd.label}{' '}
                        <span className="hfb-animation__command-highlight">{cmd.highlight}</span>
                      </>
                    ) : (
                      cmd.label
                    )}
                  </span>
                  <CommandIcon type={cmd.icon} isThankYou={cmd.isThankYou} />
                </button>
              )
            })}
          </div>

          <div className="hfb-animation__footer">
            <span className="hfb-animation__footer-label">
              Click any command or watch it auto-demo
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

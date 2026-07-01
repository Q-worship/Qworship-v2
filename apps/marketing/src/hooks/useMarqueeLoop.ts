import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

export function useMarqueeLoop(
  measureRef: RefObject<HTMLElement | null>,
  itemCount: number,
  minCopies = 2,
) {
  const [copies, setCopies] = useState(minCopies)

  useLayoutEffect(() => {
    const measure = () => {
      const el = measureRef.current
      if (!el || itemCount === 0) return

      const setWidth = el.scrollWidth / copies
      if (setWidth <= 0) return

      const needed = Math.max(minCopies, Math.ceil((window.innerWidth * 2) / setWidth))
      if (needed !== copies) {
        setCopies(needed)
      }
    }

    measure()

    const el = measureRef.current
    const resizeObserver = el ? new ResizeObserver(measure) : null
    if (el && resizeObserver) {
      resizeObserver.observe(el)
    }

    window.addEventListener('resize', measure)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measureRef, itemCount, copies, minCopies])

  return copies
}

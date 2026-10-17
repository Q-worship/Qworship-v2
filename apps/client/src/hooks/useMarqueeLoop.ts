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

      // Measure one full set (items + the gap before the next set) from the
      // children's positions. scrollWidth / copies omits one gap, so the
      // estimate drifted with `copies` and could flip-flop forever between
      // two values at some viewport widths (e.g. 3 -> 4 -> 3 at 1649px).
      const children = el.children as HTMLCollectionOf<HTMLElement>
      const setWidth =
        children.length > itemCount
          ? children[itemCount].offsetLeft - children[0].offsetLeft
          : el.scrollWidth / copies
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

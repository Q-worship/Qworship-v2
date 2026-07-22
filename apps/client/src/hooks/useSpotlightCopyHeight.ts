import { useEffect, type RefObject } from 'react'

const DESKTOP_MEDIA = '(min-width: 1280px)'
const CSS_VAR = '--spotlight-copy-height'

function syncHeight(
  grid: HTMLElement | null,
  source: HTMLElement | null,
  isDesktop: boolean,
) {
  if (!grid) return

  if (!isDesktop || !source) {
    grid.style.removeProperty(CSS_VAR)
    return
  }

  grid.style.setProperty(CSS_VAR, `${source.offsetHeight}px`)
}

export function useSpotlightCopyHeight(
  gridRef: RefObject<HTMLElement | null>,
  sourceRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const grid = gridRef.current
    const source = sourceRef.current
    if (!grid || !source) return

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA)
    let resizeObserver: ResizeObserver | null = null

    const update = () => {
      syncHeight(gridRef.current, sourceRef.current, mediaQuery.matches)
    }

    const startObserving = () => {
      if (resizeObserver || !sourceRef.current) return
      resizeObserver = new ResizeObserver(update)
      resizeObserver.observe(sourceRef.current)
    }

    const stopObserving = () => {
      resizeObserver?.disconnect()
      resizeObserver = null
    }

    const onMediaChange = () => {
      if (mediaQuery.matches) {
        startObserving()
      } else {
        stopObserving()
      }
      update()
    }

    if (mediaQuery.matches) {
      startObserving()
    }

    update()
    mediaQuery.addEventListener('change', onMediaChange)

    return () => {
      mediaQuery.removeEventListener('change', onMediaChange)
      stopObserving()
      grid.style.removeProperty(CSS_VAR)
    }
  }, [gridRef, sourceRef])
}

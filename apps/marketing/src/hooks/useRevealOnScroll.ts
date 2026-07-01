import { useEffect } from 'react'
import { useLocation } from 'wouter'

function isInViewport(el: Element) {
  const rect = el.getBoundingClientRect()
  const viewHeight = window.innerHeight || document.documentElement.clientHeight
  return rect.top < viewHeight - 150 && rect.bottom > 0
}

function activate(el: Element) {
  el.classList.add('active')
}

export function useRevealOnScroll(selector = '.reveal') {
  const [location] = useLocation()

  useEffect(() => {
    const processed = new WeakSet<Element>()
    let observer: IntersectionObserver | null = null
    let mutationFrame = 0

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activate(entry.target)
            processed.add(entry.target)
            observer?.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -150px 0px' },
    )

    const processRevealElements = () => {
      const elements = document.querySelectorAll(selector)

      elements.forEach((el) => {
        if (el.classList.contains('active') || processed.has(el)) return

        if (isInViewport(el)) {
          activate(el)
          processed.add(el)
          return
        }

        processed.add(el)
        observer?.observe(el)
      })
    }

    const scheduleProcess = () => {
      cancelAnimationFrame(mutationFrame)
      mutationFrame = requestAnimationFrame(processRevealElements)
    }

    scheduleProcess()

    const mutationObserver = new MutationObserver(scheduleProcess)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(mutationFrame)
      mutationObserver.disconnect()
      observer?.disconnect()
    }
  }, [selector, location])
}

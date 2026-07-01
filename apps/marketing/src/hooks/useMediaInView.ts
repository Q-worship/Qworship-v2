import { useEffect, useRef, useState } from 'react'

export function useMediaInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)

          container.querySelectorAll('video').forEach((video) => {
            video.preload = 'auto'
            void video.play().catch(() => {})
          })

          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '100px 0px' },
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}

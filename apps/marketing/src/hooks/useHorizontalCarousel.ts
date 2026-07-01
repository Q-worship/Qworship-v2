import { useCallback, useRef } from 'react'

export function useHorizontalCarousel(scrollAmount = 432) {
  const carouselRef = useRef<HTMLDivElement>(null)

  const scrollPrev = useCallback(() => {
    carouselRef.current?.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }, [scrollAmount])

  const scrollNext = useCallback(() => {
    carouselRef.current?.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }, [scrollAmount])

  return { carouselRef, scrollPrev, scrollNext }
}

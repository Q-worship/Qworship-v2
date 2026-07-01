import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'wouter'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation()

  useRevealOnScroll()

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, left: 0 })
  }, [location])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])

  return (
    <div className="antialiased min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

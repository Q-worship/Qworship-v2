import { useEffect, useState } from 'react'

export function useNavbarSolid(isHomePage: boolean) {
  const [isSolid, setIsSolid] = useState(!isHomePage)

  useEffect(() => {
    if (!isHomePage) {
      setIsSolid(true)
      return
    }

    const onScroll = () => setIsSolid(window.scrollY > 40)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHomePage])

  return isSolid
}

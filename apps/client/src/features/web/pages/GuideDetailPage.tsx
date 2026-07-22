import { useEffect, useState } from 'react'
import { useLocation, useRoute } from 'wouter'
import { getGuideArticleContent, getGuideById, getRelatedGuides } from '@/lib/theme'
import { GuideArticleSection } from '@/components/sections/GuideArticleSection'
import { GuideDetailHeroSection } from '@/components/sections/GuideDetailHeroSection'
import { GuideProductNav, type GuideProductId } from '@/components/sections/GuideProductNav'
import { GuideRelatedSection } from '@/components/sections/GuideRelatedSection'
import { GuideStepsSection } from '@/components/sections/GuideStepsSection'

export function GuideDetailPage() {
  const [, params] = useRoute('/guides/:guideId')
  const [, setLocation] = useLocation()
  const [activeProduct, setActiveProduct] = useState<GuideProductId>('live-console')

  const guide = params?.guideId ? getGuideById(params.guideId) : undefined

  useEffect(() => {
    if (!guide) {
      setLocation('/guides')
    }
  }, [guide, setLocation])

  useEffect(() => {
    setActiveProduct('live-console')
  }, [guide?.id])

  if (!guide) {
    return null
  }

  const articleContent = getGuideArticleContent(guide.id)
  const relatedGuides = getRelatedGuides(guide.id, guide.categoryId)
  const hasProductNav = Boolean(guide.cloudSteps)

  return (
    <>
      <GuideDetailHeroSection guide={guide} compact={hasProductNav} />
      {hasProductNav && (
        <GuideProductNav activeProduct={activeProduct} onChange={setActiveProduct} />
      )}
      <GuideArticleSection content={articleContent} compact={hasProductNav} />
      <GuideStepsSection guide={guide} activeProduct={activeProduct} />
      <GuideRelatedSection cards={relatedGuides} />
    </>
  )
}

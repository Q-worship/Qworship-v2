import { alternatingBlocks } from '@/lib/theme'

import { SiteContainer } from '@/components/layout/SiteContainer'

import { MaterialIcon } from '@/components/ui/MaterialIcon'

function BlockCopy({
  title,
  description,
  linkText,
}: {
  title: string
  description: string
  linkText?: string
}) {
  return (
    <div className="alternating-block__copy">
      <h2>{title}</h2>
      <p>{description}</p>
      {linkText && (
        <a href="#" className="alternating-block__link">
          {linkText} <MaterialIcon name="arrow_forward" />
        </a>
      )}
    </div>
  )
}

function BlockMedia({ image, alt }: { image?: string; alt: string }) {
  return (
    <div className="alternating-block__media">
      {image ? (
        <img className="alternating-block__image" src={image} alt={alt} />
      ) : (
        <div className="alternating-block__placeholder" aria-hidden="true" />
      )}
    </div>
  )
}

export function AlternatingBlocksSection() {
  return (
    <section className="alternating-blocks-section section-gap">
      <SiteContainer className="space-y-16 md:space-y-32 lg:space-y-40">
        {alternatingBlocks.map((block, index) => {
          const imageFirst = block.imageFirst ?? index % 2 === 1

          return (
            <div
              key={block.title}
              className={`alternating-block reveal${imageFirst ? ' alternating-block--image-first' : ''}`}
            >
              <BlockCopy
                title={block.title}
                description={block.description}
                linkText={block.linkText}
              />
              <BlockMedia image={block.image} alt={block.title} />
            </div>
          )
        })}
      </SiteContainer>
    </section>
  )
}

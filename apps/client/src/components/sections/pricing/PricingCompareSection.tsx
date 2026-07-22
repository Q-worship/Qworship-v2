import { useMemo, useState } from 'react'
import type {
  PlanCell,
  PricingCompareCategory,
  PricingCompareCategoryId,
  PricingCompareRow,
  PricingProductContent,
} from '@/types/content'
import { SiteContainer } from '@/components/layout/SiteContainer'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

function CompareCell({ value }: { value: PlanCell }) {
  if (value === true) {
    return (
      <span className="pricing-compare-check">
        <MaterialIcon name="check" filled className="text-[10px]" />
      </span>
    )
  }

  if (value === false) {
    return <span className="pricing-compare-x" aria-label="Not included">×</span>
  }

  return <span className="pricing-compare-text">{value}</span>
}

interface PricingCompareSectionProps {
  heading: string
  subtitle: string
  rows: PricingCompareRow[]
  categories: PricingCompareCategory[]
  columnLabels: PricingProductContent['compareColumnLabels']
}

export function PricingCompareSection({
  heading,
  subtitle,
  rows,
  categories,
  columnLabels,
}: PricingCompareSectionProps) {
  const [activeCategory, setActiveCategory] = useState<PricingCompareCategoryId>('all')

  const filteredRows = useMemo(() => {
    if (activeCategory === 'all') return rows
    return rows.filter((row) => row.category === activeCategory)
  }, [activeCategory, rows])

  return (
    <section id="compare" className="pricing-compare-section section-gap reveal scroll-mt-28">
      <SiteContainer>
        <div className="pricing-compare-header">
          <h2 className="pricing-compare-heading font-headline">{heading}</h2>
          <p className="pricing-compare-subtitle">{subtitle}</p>
        </div>

        <div className="pricing-compare-filters hide-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`pricing-compare-filter${activeCategory === category.id ? ' pricing-compare-filter--active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="pricing-compare-table-wrap">
          <table className="pricing-compare-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">{columnLabels.free}</th>
                <th scope="col">{columnLabels.starter}</th>
                <th scope="col" className="pricing-compare-col-premium">{columnLabels.premium}</th>
                <th scope="col">{columnLabels.enterprise}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.label}</th>
                  <td><CompareCell value={row.free} /></td>
                  <td><CompareCell value={row.starter} /></td>
                  <td className="pricing-compare-col-premium"><CompareCell value={row.premium} /></td>
                  <td><CompareCell value={row.enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SiteContainer>
    </section>
  )
}

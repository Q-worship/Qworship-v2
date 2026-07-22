import { useMemo } from 'react'
import { getChatbotFaqPool } from '@/lib/chatbot'
import { faqCategoryItems } from '@/lib/theme'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface ChatbotFaqDrawerProps {
  onClose: () => void
  onSelectFaq: (question: string, answer: string) => void
}

export function ChatbotFaqDrawer({ onClose, onSelectFaq }: ChatbotFaqDrawerProps) {
  const faqPool = useMemo(() => getChatbotFaqPool(), [])

  const groupedFaqs = useMemo(() => {
    return faqCategoryItems
      .map((category) => ({
        ...category,
        items: faqPool.filter((item) => item.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0)
  }, [faqPool])

  const uncategorized = useMemo(() => {
    const knownIds = new Set(faqCategoryItems.map((c) => c.id))
    return faqPool.filter((item) => !knownIds.has(item.categoryId))
  }, [faqPool])

  return (
    <div className="chatbot-faq-drawer" role="dialog" aria-label="Frequently asked questions">
      <div className="chatbot-faq-drawer-header">
        <h3 className="chatbot-faq-drawer-title">Frequently Asked Questions</h3>
        <button
          type="button"
          className="chatbot-faq-drawer-close"
          onClick={onClose}
          aria-label="Close FAQ list"
        >
          <MaterialIcon name="close" />
        </button>
      </div>

      <div className="chatbot-faq-drawer-body hide-scrollbar">
        {groupedFaqs.map((group) => (
          <section key={group.id} className="chatbot-faq-group">
            <h4 className="chatbot-faq-group-title">{group.label}</h4>
            <ul className="chatbot-faq-list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="chatbot-faq-item"
                    onClick={() => onSelectFaq(item.question, item.answer)}
                  >
                    {item.question}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {uncategorized.length > 0 && (
          <section className="chatbot-faq-group">
            <h4 className="chatbot-faq-group-title">More</h4>
            <ul className="chatbot-faq-list">
              {uncategorized.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="chatbot-faq-item"
                    onClick={() => onSelectFaq(item.question, item.answer)}
                  >
                    {item.question}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

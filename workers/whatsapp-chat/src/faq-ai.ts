import { matchFaqAnswer, getChatbotFaqPool } from '../../../src/lib/chatbotMatcher'
export type FaqResolveResult =
  | { type: 'faq'; faqId: string; answer: string }
  | { type: 'handoff' }

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct'
const MIN_CONFIDENCE = 0.7

interface AiSelection {
  faqId: string | null
  confidence: number
}

function parseAiSelection(raw: string): AiSelection | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { faqId?: string | null; confidence?: number }
    const faqId = typeof parsed.faqId === 'string' ? parsed.faqId : null
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0
    return { faqId, confidence }
  } catch {
    return null
  }
}

function getResponseText(response: unknown): string {
  if (typeof response === 'string') return response
  if (response && typeof response === 'object' && 'response' in response) {
    const text = (response as { response?: unknown }).response
    return typeof text === 'string' ? text : ''
  }
  return ''
}

export async function resolveFaqWithAi(query: string, ai: Ai): Promise<FaqResolveResult> {
  const ruleMatch = matchFaqAnswer(query)
  if (ruleMatch) {
    return { type: 'faq', faqId: ruleMatch.id, answer: ruleMatch.answer }
  }

  const pool = getChatbotFaqPool()
  const faqList = pool.map((faq) => `${faq.id} | ${faq.question}`).join('\n')

  const systemPrompt = [
    'You are a FAQ router for Q-worship church presentation software.',
    'Return ONLY valid JSON with this shape: {"faqId":"faq-id-or-null","confidence":0.0-1.0}.',
    'Pick faqId only when the user question is clearly answered by that FAQ.',
    'Return {"faqId":null,"confidence":0} when off-topic, unsure, or no FAQ fits.',
    'Never invent faq ids. Never write an answer — only select an id.',
  ].join(' ')

  const userPrompt = `FAQ list:\n${faqList}\n\nUser question: ${query}`

  try {
    const result = await ai.run(AI_MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const selection = parseAiSelection(getResponseText(result))
    if (!selection || !selection.faqId || selection.confidence < MIN_CONFIDENCE) {
      return { type: 'handoff' }
    }

    const faq = pool.find((item) => item.id === selection.faqId)
    if (!faq) {
      return { type: 'handoff' }
    }

    return { type: 'faq', faqId: faq.id, answer: faq.answer }
  } catch {
    return { type: 'handoff' }
  }
}

export interface MockPresentation {
  id: string
  name: string
  scheduledFor: string
  modified: string
  slideCount: number
}

export const mockPresentations: MockPresentation[] = [
  {
    id: '1',
    name: 'test 9',
    scheduledFor: 'April 16, 2026',
    modified: 'Modified April 16, 2026',
    slideCount: 0,
  },
  {
    id: '2',
    name: 'Test 3',
    scheduledFor: 'April 25, 2026',
    modified: 'Modified April 23, 2026',
    slideCount: 7,
  },
  {
    id: '3',
    name: 'Test 7',
    scheduledFor: 'April 18, 2026',
    modified: 'Modified May 9, 2026',
    slideCount: 2,
  },
]

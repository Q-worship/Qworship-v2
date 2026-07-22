export const onboardingFeatureOptions = [
  'Speech-to-text Hands Free Bible',
  'Manual On-screen Bible Search',
  'Song Book & Audience Sing-along',
  'Song Builder & Importer (PDF & DOCX)',
  'Service Order Builder',
  'Announcements',
  'Advanced Collection Tagging',
  'My Media & Cloud Media Library',
  'Rich canvas (text, elements, images or layers)',
  'Image & Video Slides',
  'Lower Third Builder',
  'Webpage Search & Projection',
  'Templates',
  'Sermon Record',
] as const

export type OnboardingFeatureId = (typeof onboardingFeatureOptions)[number]

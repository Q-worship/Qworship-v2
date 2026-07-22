export interface OnboardingSlide {
  id: string
  image: string
  alt: string
  title: string
  body: string
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'enhance',
    image: '/Photos/login/Group%201171276018.webp',
    alt: 'Q-worship presentation interface with audio waveform',
    title: 'ENHANCE',
    body: 'Transform your church experience with one complete presentation system',
  },
  {
    id: 'hands-free-bible',
    image: '/Photos/login/Group%201171276012.webp',
    alt: 'Hands-free Bible voice-powered scripture presentation',
    title: 'HANDS-FREE BIBLE',
    body: 'Experience effortless scripture access with voice-powered Bible presentation.',
  },
  {
    id: 'songbook',
    image: '/Photos/onboarding/speech-to-text.webp',
    alt: 'Songbook lyrics presentation interface',
    title: 'SONGBOOK',
    body: 'Organize, manage and present worship songs with speed and simplicity',
  },
]

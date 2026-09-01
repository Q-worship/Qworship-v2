import type {
  AccordionSpotlightContent,
  BuildTabItem,
  ChecklistSpotlightContent,
  CompatibleSystem,
  CoreBelief,
  FeatureCard,
  FeaturesSubNavItem,
  GuideCard,
  GuideArticleContent,
  GuideCategoryItem,
  FaqCategoryItem,
  FaqItem,
  DownloadsPageCopy,
  HandsFreeFeature,
  InsightCard,
  JobOpening,
  MoreFeature,
  NavDropdownItem,
  NavLink,
  PricingCompareCategory,
  PricingCompareRow,
  PricingIncludedFeature,
  PricingPageCopy,
  PricingPlan,
  PricingProductContent,
  PricingProductId,
  TabItem,
  TeamCard,
  WorkBenefit,
} from '@/types/content'

export const REFER_JOIN_PATH = '/refer-and-earn/join'

export const navLinks: NavLink[] = [
  { label: 'Features', href: '/features' },
  { label: 'About', href: '/about' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources' },
  { label: 'Refer & Earn', href: '/refer-and-earn' },
]

export const resourceDropdownItems: NavDropdownItem[] = [
  { label: 'Downloads', href: '/downloads' },
  { label: 'Guides', href: '/guides' },
  { label: 'FAQs', href: '/faqs' },
]

export const tabItems: TabItem[] = [
  {
    id: 'service',
    label: 'Service Order',
    title: 'Infinite Canvas Engine',
    description:
      'Layer lyrics, 4K motion backgrounds, and alpha-channel videos with a non-destructive workflow that feels like a professional studio.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAM-hg5zobIWbBtFaGR8biAsD4LgXjPRf-n5S5MmQCi9XoIkYVJ57UDRwNUTg0W9AkDgEDwcP0ZokxHqn4eaaeTTVgNJWNJJPCXFmPX_h69InbColdbg1pzCofEKsoZsbPNbChbZdpQgo4Q5qv6qZ_KyAt4dthcYMPa_bafis1ggMcQB8nB2dvVieGMGiEaWX6hK3pYZ6GBcJtNX8to-JpD9IP2mueRsVd_yvTzMVDp15Ax-1v4AUqatLC30HjQj9Rgy7gNDd_B0I7c',
  },
  {
    id: 'songs',
    label: 'Songs',
    title: 'Cinematic Song Management',
    description:
      'Import and manage thousands of songs with ease. Dynamic formatting ensures every lyric slide looks perfect on every screen.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCOOWixaFiQhuMVN-Dgp9sjkSWQX1U2bAuIDINRBv4MeImrrUKFauIwPKuZee-0sf9E_o9CNpdx_NClSmo3mUDXSvXflzd3DMrdOBceYKv7sXXaY2AmlZ_xDN2tYX41CSylWnEN4AAiWjOmaw_158069SN1EDVblml3kItbWsZa0qP2Smw8-vLLFh9_qQOWwANw_e2Qg0qjA8hmuPed5N1KAg_fa6q3twwpqkhXVgOgQE-nREuMpEJkg4CgC4QtqcrDMSpAwU1f-Q2',
  },
  {
    id: 'onscreen',
    label: 'On-screen Bible',
    title: 'Live On-screen Bible',
    description:
      'Instant access to over 100 Bible translations. Drag and drop verses directly into your live production timeline.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBoZq0pU7bsoY4WOn1blm0SJru5aFOjpvunzZNfduOhxL6hR-YGaIKMY4kVTC9gbS34QIFfLWQkDXAo_evd5K2Oo9X_PFt1Bs8IByMAi_Qi7mxkE049kcSsc_AENcURiUOIiz_Tb1766qTZ4tZrwTY79tFWGlhesD7ixgqK8d4JQR-KaqMTxUMTppUWaRBUDiI5OHSG18MPoi9TEin1LmHhWVD2glxVxfpCpn4N8yINZGhggy8nRzmvytD7r6AjM_9nEGWHKuWjjfab',
  },
  {
    id: 'handsfree',
    label: 'Hands-Free Bible®',
    title: 'Speech-to-Text Integration',
    description:
      'Our proprietary AI tracks spoken words and automatically cues the correct scripture references in real-time.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAywanEgW5IqAtQHIiOEdxjc72AMFB3CqkczeXRn7QfkFV1SIw-plJpFPaUcUOdNX5qV8nuZMOnjTjZkrLKvnybnQVEBMD8FsG96c9J2bk0hd4aPeDcttgAAobgDgertbtNe5oRKD1puetUDXQuQFtJA-NkB5VmPfSJKH4u6gt_7LpZvalD1RsRR2KkWqrH_7KeDmGJb1XXn9i_L_zp4Fse6hzo-i5Wz0y9Tbl6gLCtKiC3cl6l6CY5mh2-2zABqLTIuOMcpRb42uSR',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    title: 'Automated Loop Engine',
    description:
      'Keep your congregation informed with smart announcement loops that update dynamically from your calendar.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAM-hg5zobIWbBtFaGR8biAsD4LgXjPRf-n5S5MmQCi9XoIkYVJ57UDRwNUTg0W9AkDgEDwcP0ZokxHqn4eaaeTTVgNJWNJJPCXFmPX_h69InbColdbg1pzCofEKsoZsbPNbChbZdpQgo4Q5qv6qZ_KyAt4dthcYMPa_bafis1ggMcQB8nB2dvVieGMGiEaWX6hK3pYZ6GBcJtNX8to-JpD9IP2mueRsVd_yvTzMVDp15Ax-1v4AUqatLC30HjQj9Rgy7gNDd_B0I7c',
  },
]

export const buildSectionCopy = {
  subtitle:
    'Our Hands-free Bible is just the start. From the opening song to the closing prayer, Q-worship holds your entire service together. Arrange every item, jump between sections, and never lose your place — even if the service takes an unexpected turn.',
}

export const buildTabItems: BuildTabItem[] = [
  {
    id: 'service',
    label: 'Service Order',
    title: { line1: 'Your Service.', line2: 'Fully in Your Hands.' },
    description:
      'Your songs, scriptures, announcements and media — all in one place, all in the right order, all ready to go live the moment you need them. Qworship holds your entire service together so you never lose your place, no matter what the service demands.',
    features: [
      'Everything in one place — songs, Bible, announcements',
      'Reorder items on the fly without losing your work',
      'Your service saves automatically, every step of the way',
      'Pick up exactly where you left off, every time',
      'Navigate your whole service with simple keyboard shortcuts',
    ],
    image: '/Photos/Service%20order.webp',
  },
  {
    id: 'songs',
    label: 'Songs',
    title: { line1: 'Every Lyric.', line2: 'Right on Time.' },
    description:
      'Lead worship with complete confidence. Move through each section of your songs — Verse, Chorus, Bridge and beyond. Let your congregation see every word, perfectly in sync, exactly and sing along when you need it.',
    features: [
      'Navigate Verse, Chorus, Bridge, Tag and more with one click',
      'What you see is what your congregation sees — always',
      'Edit songs directly inside Qworship, no extra tools needed',
      'Bring in songs from Word documents, PDFs or text files',
      'Keep your CCLI number, song key and tempo all in one place',
    ],
    image: '/Photos/Songs.webp',
  },
  {
    id: 'onscreen',
    label: 'On-screen Bible',
    title: { line1: 'Search Any Scripture.', line2: 'In Any Version. In Seconds.' },
    description:
      'Stop fumbling with tabs and search bars mid-sermon. Find any verse across all 66 books, switch between translations on the spot, and put it on screen for your whole congregation — instantly.',
    features: [
      'Search any verse across all 66 books of the Bible with easy type',
      'Switch between bible versions easily mid-service',
      'Project a single verse or a whole passage with one click',
      'See a preview of every slide before it goes live',
      'Move through chapters and verses without losing your flow',
    ],
    image: '/Photos/On-screen%20bible.webp',
  },
  {
    id: 'handsfree',
    label: 'Hands-Free Bible™',
    title: { line1: 'No need to Type.', line2: 'Just Speak' },
    description:
      'Stay in the moment. Just say the reference out loud — Qworship hears you, finds the verse, and puts it on screen. No pausing, no searching, no breaking your stride at the pulpit.',
    features: [
      'Just say the verse — Qworship finds it instantly',
      'Works with all Bible translations',
      'Understands natural speech — say it however feels natural',
      'Remembers where you are so you can say “next verse” and keep going',
      'Say “thank you” or “amen” and the screen clears itself',
    ],
    image: '/Photos/Hands%20free%20Bible.webp',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    title: { line1: 'Keep Your Church', line2: 'In the Loop' },
    description:
      'Slide your announcements, countdowns and notices straight into your service — no switching apps, no second screen, no interruptions. Your whole service flows as one, from welcome to benediction.',
    features: [
      'Announcements sit right inside your service order',
      'Add a countdown so your congregation knows when things start',
      'Customise the look to match your church’s style',
      'Move seamlessly from announcements into worship',
      'Everything on one screen, always under your control',
    ],
    image: '/Photos/Announcements.webp',
  },
]

export const heroShowcaseTabs: TabItem[] = [
  ...tabItems,
  {
    id: 'slides',
    label: 'Slides',
    title: 'Dynamic Slide Builder',
    description:
      'Design and present beautiful slides with motion backgrounds, lyrics, and scripture — all from one unified canvas.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBCOOWixaFiQhuMVN-Dgp9sjkSWQX1U2bAuIDINRBv4MeImrrUKFauIwPKuZee-0sf9E_o9CNpdx_NClSmo3mUDXSvXflzd3DMrdOBceYKv7sXXaY2AmlZ_xDN2tYX41CSylWnEN4AAiWjOmaw_158069SN1EDVblml3kItbWsZa0qP2Smw8-vLLFh9_qQOWwANw_e2Qg0qjA8hmuPed5N1KAg_fa6q3twwpqkhXVgOgQE-nREuMpEJkg4CgC4QtqcrDMSpAwU1f-Q2',
  },
]

export const handsFreeFeatures: HandsFreeFeature[] = [
  {
    title: 'Hands-free Bible',
    description:
      "Intelligent voice recognition tracks your pastor's sermon and automatically prepares scriptures.",
    active: true,
  },
  {
    title: 'Dynamic Theming',
    description: 'Adapt your scripture styling on the fly with cinematic presets.',
  },
  {
    title: 'Multi-Version Sync',
    description: 'Display multiple translations side-by-side automatically.',
  },
]

export const handsFreeSectionCopy = {
  title: 'Meet the Q-worship Hands-Free Bible',
  tagline: {
    line1: 'Your Scripture. Found by Speech. Projected',
    line2: 'in Seconds.',
  },
  body: 'For ages, pastors have paused mid-sermon to wait for a verse. Q-worship ends that. Powered by our advanced speech-to-text engine, the Q-worship Hands-Free Bible listens as you lead, understanding natural language, retaining context, and instantly surfacing the exact scripture you need across major Bible translations.',
}

export const finalCtaCopy = {
  heading: {
    line1: 'Ready to step into the',
    line2: 'Future of church presentation?',
  },
  body: 'Join thousands of churches delivering high-impact church experiences with the power of Qworship.',
  primaryCta: 'Get started for free',
  downloadCta: 'Download',
}

export const handsFreeShowcaseTabs: TabItem[] = [
  {
    id: 'handsfree',
    label: 'Hands-free Bible',
    title: 'Hands-free Bible',
    description:
      "Intelligent voice recognition tracks your pastor's sermon and automatically prepares scriptures.",
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAywanEgW5IqAtQHIiOEdxjc72AMFB3CqkczeXRn7QfkFV1SIw-plJpFPaUcUOdNX5qV8nuZMOnjTjZkrLKvnybnQVEBMD8FsG96c9J2bk0hd4aPeDcttgAAobgDgertbtNe5oRKD1puetUDXQuQFtJA-NkB5VmPfSJKH4u6gt_7LpZvalD1RsRR2KkWqrH_7KeDmGJb1XXn9i_L_zp4Fse6hzo-i5Wz0y9Tbl6gLCtKiC3cl6l6CY5mh2-2zABqLTIuOMcpRb42uSR',
  },
  {
    id: 'theming',
    label: 'Dynamic Theming',
    title: 'Dynamic Theming',
    description: 'Adapt your scripture styling on the fly with cinematic presets.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAywanEgW5IqAtQHIiOEdxjc72AMFB3CqkczeXRn7QfkFV1SIw-plJpFPaUcUOdNX5qV8nuZMOnjTjZkrLKvnybnQVEBMD8FsG96c9J2bk0hd4aPeDcttgAAobgDgertbtNe5oRKD1puetUDXQuQFtJA-NkB5VmPfSJKH4u6gt_7LpZvalD1RsRR2KkWqrH_7KeDmGJb1XXn9i_L_zp4Fse6hzo-i5Wz0y9Tbl6gLCtKiC3cl6l6CY5mh2-2zABqLTIuOMcpRb42uSR',
  },
  {
    id: 'sync',
    label: 'Multi-Version Sync',
    title: 'Multi-Version Sync',
    description: 'Display multiple translations side-by-side automatically.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBoZq0pU7bsoY4WOn1blm0SJru5aFOjpvunzZNfduOhxL6hR-YGaIKMY4kVTC9gbS34QIFfLWQkDXAo_evd5K2Oo9X_PFt1Bs8IByMAi_Qi7mxkE049kcSsc_AENcURiUOIiz_Tb1766qTZ4tZrwTY79tFWGlhesD7ixgqK8d4JQR-KaqMTxUMTppUWaRBUDiI5OHSG18MPoi9TEin1LmHhWVD2glxVxfpCpn4N8yINZGhggy8nRzmvytD7r6AjM_9nEGWHKuWjjfab',
  },
  {
    id: 'voice',
    label: 'Voice Tracking',
    title: 'Voice Tracking',
    description:
      'Our proprietary AI tracks spoken words and automatically cues the correct scripture references in real-time.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAywanEgW5IqAtQHIiOEdxjc72AMFB3CqkczeXRn7QfkFV1SIw-plJpFPaUcUOdNX5qV8nuZMOnjTjZkrLKvnybnQVEBMD8FsG96c9J2bk0hd4aPeDcttgAAobgDgertbtNe5oRKD1puetUDXQuQFtJA-NkB5VmPfSJKH4u6gt_7LpZvalD1RsRR2KkWqrH_7KeDmGJb1XXn9i_L_zp4Fse6hzo-i5Wz0y9Tbl6gLCtKiC3cl6l6CY5mh2-2zABqLTIuOMcpRb42uSR',
  },
]

const rectanglePortrait = '/Photos/Rectangle%209.webp'
const pastorForPastor = '/Photos/pASTORS%20(2).webp'
const downloadBannerImage = '/Photos/Download%201.webp'
const downloadOnlineCtaImage = '/Photos/Download%202.webp'

export const featureGridCards: FeatureCard[] = [
  {
    title: 'Lightweight & Fast to Install',
    description:
      'Q-worship installs in minutes. No IT department, no server setup, no configuration headaches. Download, open, and you\'re ready for Sunday.',
    image: '/Photos/eas%20to%20use.webp',
  },
  {
    title: 'Easy To Use by Everyone',
    description:
      'Qworship was designed so that anyone on your team, from the senior pastor to the newest volunteer can take the controls with confidence. Clean interface, voice commands, and a workflow that just makes sense.',
    image: '/Photos/onlin%20and....webp',
  },
]

export const featureGridHighlight: FeatureCard = {
  title: 'Online & Offline Ready',
  description:
    'No Wi-Fi? No problem. Qworship works fully offline so your service never stops — whether you\'re in a rural church, a school hall, or a venue with no internet.',
  image: '/Photos/lightweight.webp',
}

export const alternatingBlocks: FeatureCard[] = [
  {
    title: 'In-built Lower Third Builder',
    description:
      'Create broadcast-quality name and title graphics directly inside Q-worship. Display speaker names, sermon titles, and announcements on your live stream — no extra software needed.',
    image: '/Photos/third-builder.webp',
    linkText: 'Learn more',
    imageFirst: false,
  },
  {
    title: 'NDI Support',
    description:
      "Send Qworship's output over your network as an NDI source. Route Bible verses, lyrics, and media directly into your video switcher or streaming rig — no capture cards, no extra cables.",
    image: '/Photos/NDL.webp',
    linkText: 'Learn more',
    imageFirst: true,
  },
  {
    title: 'Easy to use',
    description:
      'Layer lyrics, 4K motion backgrounds, and alpha-channel videos with a non-destructive workflow that feels like a professional studio.',
    image: '/Photos/Easy%20to%20use.webp',
    linkText: 'Infinite Canvas Engine',
    imageFirst: false,
  },
]

const praiseAndWorshipImage = '/Photos/Praise%20and%20Worship.webp'

export const teamCards: TeamCard[] = [
  {
    title: 'Pastors',
    description:
      'Built with Bible speech to text Intelligence, Q-worship helps Pastors to fetch bible scripture across all the popular Bible versions using voice command during live service.',
    image: '/Photos/Pastors.webp',
    icon: 'layers',
    showButton: true,
    buttonText: 'Start for free today',
  },
  {
    title: 'Praise & Worship',
    description:
      'Import and project lyrics and let the congregation sing along. Switch between backgrounds for an immersive and dynamic worship journey.',
    image: praiseAndWorshipImage,
    icon: 'layers',
    showButton: true,
    buttonText: 'Start for free today',
  },
  {
    title: 'Media Team',
    description:
      'Our user-friendly tools empower tech teams to craft presentations, control speech-to-text Bible features remotely, and create seamless slides all from a single, intuitive platform.',
    image: praiseAndWorshipImage,
    icon: 'layers',
    showButton: true,
    buttonText: 'Start for free today',
  },
]

export const moreFeatures: MoreFeature[] = [
  {
    title: 'Cloud Media Library',
    description:
      'Upload your own images, videos, and audio or browse platform-provided assets. Every file is tagged, categorised, and searchable so you find the right background in seconds, not minutes.',
  },
  {
    title: 'Songbook Management',
    description:
      'Build and maintain your entire church songbook in one place. Import from Word, PDF, or text files. Organise by author, topic, or tag.',
  },
  {
    title: 'Slide Canvas',
    description:
      'Layer lyrics, Bible verses, media, and graphics on a fully customisable canvas. Control backgrounds, logo positioning, and widget placement to create a presentation that looks uniquely yours.',
  },
  {
    title: 'Web Page',
    description:
      'Display any web page directly on your projection screen — live streams, church websites, event pages, or online giving portals without switching applications or losing your place in the service.',
  },
  {
    title: 'Sermon Record',
    description:
      'Keep a structured record of every sermon — title, scripture reference, speaker, date, and notes. Build a searchable archive your whole team can reference week after week.',
  },
  {
    title: 'Flexible & Modular',
    description:
      'From a single pastor running everything to a full tech crew managing multiple campuses. Qworship grows with your church. Use only the features you need today and unlock more as your team scales.',
  },
]

export const compatibleSystems: CompatibleSystem[] = [
  { name: 'OBS', icon: 'obs' },
  { name: 'Pro Presenter', icon: 'propresenter' },
  { name: 'Vmix', icon: 'vmix' },
  { name: 'Easy Worship', icon: 'easyworship' },
  { name: 'OpenLP', icon: 'openlp' },
]

export const assetLibraryVideos = [
  '/Photos/Copy%20of%20intence3.mp4',
  '/Photos/Copy%20of%20Jordan3.mp4',
  '/Photos/Copy%20of%20jordan4.mp4',
  '/Photos/Copy%20of%20liquid%20_1.mp4',
] as const

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Enterprise',
    monthlyPrice: '$15.99',
    yearlyPrice: '$12.99',
    badge: 'Recommended',
    highlighted: true,
  },
  {
    name: 'Premium',
    monthlyPrice: '$12.99',
    yearlyPrice: '$9.99',
    badge: 'Best value',
  },
  {
    name: 'Starter',
    monthlyPrice: '$8.99',
    yearlyPrice: '$6.99',
    badge: 'Cheapest',
  },
  {
    name: 'Free',
    monthlyPrice: '$0.00',
    yearlyPrice: '$0.00',
    badge: 'No credit card',
    badgeVariant: 'muted',
  },
]

export const pricingFeatures = [
  'Voice-powered Bible search',
  'Multiple Bible Translation',
  'Cloud media library with drag-and-drop upload',
  'Song projection system',
  'On-screen Bible with Multiple Versions',
]

export const pricingPageCopy: PricingPageCopy = {
  hero: {
    heading: { before: 'Simple Pricing for', accent: 'Every Church' },
    body: 'Start your 30-day free trial today — no credit card required, no watermarks, no limits. One subscription covers your entire team on Mac and Windows.',
    footnote: 'Your free trial starts automatically when you create an account.',
    platforms: [
      { id: 'windows', label: 'Windows', icon: 'windows' },
      { id: 'mac', label: 'Mac Os', icon: 'mac' },
    ],
  },
  productNav: {
    brand: 'Q-worship Products',
    items: [
      {
        id: 'live-console',
        label: 'Q-worship Live Console',
        badge: 'Desktop Application',
      },
      {
        id: 'cloud',
        label: 'Q-worship Cloud Presentation System',
        badge: 'Cloud',
      },
    ],
  },
  faqHeading: 'Frequently Asked Questions',
  faqBody:
    "Everything you need to know about Qworship pricing. Can't find what you're looking for?",
  faqCta: 'View more FAQs',
}

export const guideProductInfo: Record<'live-console' | 'cloud', { title: string; description: string }> = {
  'live-console': {
    title: 'Q-worship Live Console',
    description:
      'is a desktop application for Windows and macOS. It works offline once Bible data is downloaded, and connects to the internet for voice transcription and cloud sync. Best for churches with a dedicated operator machine connected to a projector.',
  },
  cloud: {
    title: 'Q-worship Cloud Presentation System',
    description:
      'is a browser-based presentation tool. Nothing to install — sign in from any computer and your Bible data, songs, and service orders sync automatically. Best for teams that run service from a shared or borrowed machine.',
  },
}

const liveConsolePlans: PricingPlan[] = [
  {
    name: 'Free',
    monthlyPrice: '$0.00',
    yearlyPrice: '$0.00',
    badge: '',
    description: 'Perfect for solo pastors getting started.',
    features: [
      'Online Voice Bible Search (KJV only)',
      'Complete Offline Voice Bible Search (KJV only)',
      'On-screen Bible - KJV only',
      'Live projection - Single Screen',
      'Media Assets - limited to my media',
      'Lower Third builder - Limited',
      'NDI Connectivity',
      'Community Support',
    ],
    ctaLabel: 'Get Started Free',
    ctaVariant: 'outline',
  },
  {
    name: 'Starter',
    monthlyPrice: '$8.99',
    yearlyPrice: '$6.99',
    badge: 'CHEAPEST',
    description: 'For small churches ready to level up.',
    includesLabel: 'Everything in Free, plus:',
    features: [
      'Online Voice Bible Search (3 Bibles)',
      'Complete Offline Voice Bible Search (3 Bibles)',
      'On-screen Bible - 3 Bibles',
      'Live projection - Multiple Screen',
      'Songbook with song - Limited',
      'Song Import from DOCX and PDF',
      'Cloud media library access - limited',
    ],
    ctaLabel: 'Start free trial',
    ctaVariant: 'outline',
  },
  {
    name: 'Premium',
    monthlyPrice: '$12.99',
    yearlyPrice: '$9.99',
    badge: '',
    popularLabel: 'MOST POPULAR',
    highlighted: true,
    description: 'The complete solution for growing churches',
    includesLabel: 'Everything in Starter, plus:',
    features: [
      'Online Voice Bible Search (6 Bibles)',
      'Complete Offline Voice Bible Search (6 Bibles)',
      'On-screen Bible - 6 Bibles',
      'Multi-branch access - up to 5 Branches',
      'Complete Songbook with song import from DOCX, PDF',
      'Full lower Third Builder',
      'Full Cloud media library access',
    ],
    ctaLabel: 'Start free trial',
    ctaVariant: 'gradient',
  },
  {
    name: 'Enterprise',
    monthlyPrice: '$15.99',
    yearlyPrice: '$12.99',
    badge: 'RECOMMENDED',
    description: 'The complete solution for growing churches',
    includesLabel: 'Everything in Premium, plus:',
    features: [
      'Online Voice Bible Search (+10 Bibles)',
      'Complete Offline Voice Bible Search (+10 Bibles)',
      'On-screen Bible with +10 Bibles',
      'Multi-branch discount access - up to 10 Branches',
      'Dedicated Account Manager',
      'Custom Onboarding & Training',
      'Priority phone and chat support',
    ],
    ctaLabel: 'Start free trial',
    ctaVariant: 'outline',
  },
]

const liveConsoleIncludedFeatures: PricingIncludedFeature[] = [
  {
    title: 'Hands-Free Bible',
    description:
      'Search 31,408 verses across 6 translations using only your voice. No typing, no clicking.',
    icon: 'mic',
  },
  {
    title: '100% Offline Ready',
    description:
      'Full functionality with zero internet. Your service never stops, no matter the venue.',
    icon: 'wifi_off',
  },
  {
    title: '6 Bible Translations',
    description:
      'KJV, NKJV, NIV, ESV, AMP, and MSG — switch translations mid-service with a single voice command.',
    icon: 'menu_book',
  },
  {
    title: 'Songbook & Projection',
    description:
      'Build your church song library and project lyrics section by section with real-time sync.',
    icon: 'music_note',
  },
  {
    title: 'GO LIVE Mode',
    description:
      'Full-screen presentation mode with multi-screen output, logo overlay, and widget positioning.',
    icon: 'tv',
  },
  {
    title: 'Auto-Save & Recovery',
    description:
      'Your service is saved continuously. A crash or restart restores your workspace exactly.',
    icon: 'save',
  },
]

const cloudIncludedFeatures: PricingIncludedFeature[] = [
  {
    title: 'Order of Service Builder',
    description:
      'Build your full service flow with songs, Bible, announcements, videos, and images in one timeline.',
    icon: 'event_note',
  },
  {
    title: 'Hands-Free Bible',
    description:
      'Search 31,408 verses across multiple translations using only your voice — no typing, no clicking.',
    icon: 'mic',
  },
  {
    title: 'Rich Slide Canvas',
    description:
      'Layer text, elements, images, QR codes, and templates on a flexible worship slide canvas.',
    icon: 'palette',
  },
  {
    title: 'Cloud Media Library',
    description:
      'Upload, tag, and access your church media from any device with cloud sync.',
    icon: 'cloud_queue',
  },
  {
    title: 'Live Projection',
    description:
      'Project your service to screens and outputs with single-window or multi-screen support.',
    icon: 'cast',
  },
  {
    title: 'Auto-Save & Recovery',
    description:
      'Your order of service is saved continuously. A crash or restart restores your workspace exactly.',
    icon: 'save',
  },
]

export const pricingCompareCategories: PricingCompareCategory[] = [
  { id: 'all', label: 'All' },
  { id: 'bible', label: 'Bible' },
  { id: 'songbook', label: 'Songbook' },
  { id: 'media', label: 'Media' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'lower-third', label: 'Lower Third' },
  { id: 'size', label: 'Size' },
  { id: 'support', label: 'Support' },
]

const liveConsoleCompareRows: PricingCompareRow[] = [
  {
    id: 'voice-bible-search',
    label: 'Voice Bible search',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'all-bible-translations',
    label: 'All 10+ Bible Translations',
    category: 'bible',
    free: false,
    starter: false,
    premium: true,
    enterprise: true,
  },
  {
    id: 'verse-database',
    label: '31,406 verse database',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'session-context',
    label: 'Session Context Retention',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'songbook',
    label: 'Songbook / Song Library',
    category: 'songbook',
    free: false,
    starter: 'Unlimited',
    premium: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    id: 'song-import',
    label: 'Song import (PDF, DOCX)',
    category: 'songbook',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'live-projection',
    label: 'Live projection (GO-LIVE)',
    category: 'integrations',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'multi-screen',
    label: 'Multi-screen output',
    category: 'integrations',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'custom-background',
    label: 'Custom background & logo',
    category: 'media',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'lower-third-builder',
    label: 'Lower Third Builder',
    category: 'lower-third',
    free: false,
    starter: 'Limited',
    premium: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    id: 'ndi-output',
    label: 'NDI output',
    category: 'integrations',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'my-media',
    label: 'My media (user uploads)',
    category: 'media',
    free: '150MB',
    starter: '1GB',
    premium: '5GB',
    enterprise: '5GB',
  },
  {
    id: 'cloud-media',
    label: 'Cloud media library',
    category: 'media',
    free: false,
    starter: 'Limited',
    premium: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    id: 'tagging-collections',
    label: 'Advanced tagging and collections',
    category: 'media',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'on-screen-bible',
    label: 'On-screen bible',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'multi-branch',
    label: 'Multi-branch discount',
    category: 'size',
    free: false,
    starter: false,
    premium: true,
    enterprise: true,
  },
  {
    id: 'email-support',
    label: 'Email Support',
    category: 'support',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'community-support',
    label: 'Community support',
    category: 'support',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'priority-support',
    label: 'Priority support',
    category: 'support',
    free: false,
    starter: false,
    premium: false,
    enterprise: true,
  },
]

const cloudPlans: PricingPlan[] = [
  {
    name: 'Free',
    monthlyPrice: '$0.00',
    yearlyPrice: '$0.00',
    badge: '',
    description: 'Try the full cloud experience at no cost.',
    features: [
      'Order of service builder',
      'Hands-Free Bible - KJV only',
      'On-screen Bible search - KJV only',
      'Song Library - Limited',
      'Media Assets - limited to My media',
      'Live projection - Single Window',
      'Basic Slide Canvas Builder',
      'Community Support & Resources',
    ],
    ctaLabel: 'Get Started Free',
    ctaVariant: 'outline',
  },
  {
    name: 'Essentials',
    monthlyPrice: '$8.99',
    yearlyPrice: '$6.99',
    badge: 'CHEAPEST',
    description: 'Everything you need to run a full church service.',
    includesLabel: 'Everything in Free, plus:',
    features: [
      'Online Voice Bible Search (3 Bibles)',
      'On-screen Bible - 3 Bibles',
      'Full Service Item Library (Song, Bible, Announcement, Video, Image slide and more)',
      'Slide Canvas with built-in templates',
      'Cloud & My media assets library - limited access',
      'Song Import from DOCX and PDF',
      'NDI connectivity via Q-worship NDI Bridge',
      'Auto-save & Crash Recovery',
      'Email Support',
    ],
    ctaLabel: 'Start free trial',
    ctaVariant: 'outline',
  },
  {
    name: 'Pro',
    monthlyPrice: '$12.99',
    yearlyPrice: '$9.99',
    badge: '',
    popularLabel: 'MOST POPULAR',
    highlighted: true,
    description: 'The complete cloud platform for growing churches.',
    includesLabel: 'Everything in Essentials, plus:',
    features: [
      'Online Voice Bible Search (6+ Bibles)',
      'On-screen Bible - 6+ Bibles',
      'Rich Slide Canvas — text, elements, images, QR codes, layers',
      'Lower Third Builder & Pre-built templates',
      'Advanced media tagging & collections',
      'Multi-Branch Discount — Up to 5 branches',
      'PowerPoint Export & Back-up',
      'Priority Email Support',
    ],
    ctaLabel: 'Start free trial',
    ctaVariant: 'gradient',
  },
  {
    name: 'Enterprise',
    monthlyPrice: '$15.99',
    yearlyPrice: '$12.99',
    badge: 'RECOMMENDED',
    description: 'The complete solution for growing churches.',
    includesLabel: 'Everything in Pro, plus:',
    features: [
      'Online Voice Bible Search (10+ Bibles)',
      'On-screen Bible - 10+ Bibles',
      'Multi-branch discount access - up to 10 Branches',
      'Dedicated Account Manager',
      'Custom Onboarding & Training',
      'Priority phone and chat support',
    ],
    ctaLabel: 'Start free trial',
    ctaVariant: 'outline',
  },
]

export const cloudCompareCategories: PricingCompareCategory[] = [
  { id: 'all', label: 'All' },
  { id: 'bible', label: 'Bible' },
  { id: 'songbook', label: 'Songbook' },
  { id: 'media', label: 'Media' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'lower-third', label: 'Lower Third' },
  { id: 'size', label: 'Size' },
  { id: 'service', label: 'Service' },
  { id: 'support', label: 'Support' },
]

const cloudCompareRows: PricingCompareRow[] = [
  {
    id: 'hands-free-voice-bible-search',
    label: 'Hands-Free Voice Bible Search',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'all-bible-translations',
    label: 'All 10+ Bible Translations',
    category: 'bible',
    free: false,
    starter: false,
    premium: false,
    enterprise: true,
  },
  {
    id: 'verse-database',
    label: '31,406 verse database',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'verse-range-selection',
    label: 'Verse range selection',
    category: 'bible',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'order-of-service-builder',
    label: 'Order of service Builder',
    category: 'service',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'service-items',
    label: 'Songs, Bible, Announcements items',
    category: 'service',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'video-image-slide-items',
    label: 'Video & Image slide items',
    category: 'service',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'web-page-item',
    label: 'Web page item',
    category: 'service',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'basic-slide-canvas',
    label: 'Basic slide canvas',
    category: 'media',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'worship-slide-templates',
    label: 'Built-in worship slide templates',
    category: 'media',
    free: false,
    starter: 'Limited',
    premium: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    id: 'rich-canvas',
    label: 'Rich canvas (text, elements, images, or layers)',
    category: 'media',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'lower-third-builder',
    label: 'Lower Third Builder',
    category: 'lower-third',
    free: false,
    starter: 'Limited',
    premium: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    id: 'song-library',
    label: 'Song library',
    category: 'songbook',
    free: false,
    starter: 'Limited',
    premium: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    id: 'song-import',
    label: 'Song import (PDF, DOCX)',
    category: 'songbook',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'cloud-media-library',
    label: 'Cloud media library',
    category: 'media',
    free: false,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'my-media',
    label: 'My Media (user uploads)',
    category: 'media',
    free: '150MB',
    starter: '1GB',
    premium: '5GB',
    enterprise: '10GB',
  },
  {
    id: 'tagging-collections',
    label: 'Advanced tagging & Collections',
    category: 'media',
    free: false,
    starter: false,
    premium: true,
    enterprise: true,
  },
  {
    id: 'ndi-output',
    label: 'NDI Output',
    category: 'integrations',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'multi-branch',
    label: 'Multi-branch discount',
    category: 'size',
    free: false,
    starter: false,
    premium: true,
    enterprise: true,
  },
  {
    id: 'email-support',
    label: 'Email Support',
    category: 'support',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'community-support',
    label: 'Community support',
    category: 'support',
    free: true,
    starter: true,
    premium: true,
    enterprise: true,
  },
  {
    id: 'priority-support',
    label: 'Priority support',
    category: 'support',
    free: false,
    starter: false,
    premium: false,
    enterprise: true,
  },
  {
    id: 'custom-onboarding',
    label: 'Custom Onboarding & Training',
    category: 'support',
    free: false,
    starter: false,
    premium: false,
    enterprise: true,
  },
]

const liveConsoleProduct: PricingProductContent = {
  productBanner: {
    title: 'Live Console Desktop Application',
    description:
      'A lightweight, offline-first desktop app for Mac & Windows. Includes Hands-Free Bible, On-Screen Bible, Songbook, GO LIVE projection, and Media Library. Runs 100% without internet — ideal for any venue.',
    icon: 'desktop_windows',
    primaryCta: 'Download for windows',
    primaryHref: '/downloads',
    secondaryCta: 'Download for mac',
    secondaryHref: '/downloads',
  },
  plansHeader: {
    badge: 'QWORSHIP LIVE CONSOLE',
    heading: { before: 'Pricing for', accent: 'Q-worship Live Console' },
    subtitle:
      'Start your 30-day free trial today — no credit card required, no watermarks, no limits. One subscription covers your entire team on Mac and Windows.',
    tagline: "Choose the plan that's right for your church.",
  },
  plans: liveConsolePlans,
  includedHeading: 'Included with Every Plan',
  includedSubtitle:
    'No matter which tier you choose, every Live Console plan includes these core capabilities.',
  includedFeatures: liveConsoleIncludedFeatures,
  compareHeading: 'Compare Plans',
  compareSubtitle: "See exactly what's included in each tier.",
  compareRows: liveConsoleCompareRows,
  compareCategories: pricingCompareCategories,
  compareColumnLabels: {
    free: 'Free',
    starter: 'Starter',
    premium: 'Premium',
    enterprise: 'Enterprise',
  },
}

const cloudProduct: PricingProductContent = {
  productBanner: {
    title: 'Q-worship Cloud Presentation System',
    description:
      'The complete cloud-based church service platform. Build your full order of service with songs, Bible, announcements, videos, images, and a rich slide canvas — all in one place. Includes everything in the Live Console, and much more.',
    icon: 'cloud',
    primaryCta: 'Get Started for free',
    primaryHref: '/signup',
  },
  plansHeader: {
    badge: 'QWORSHIP CLOUD',
    heading: { before: 'Pricing for', accent: 'Q-worship Cloud Presentation System' },
    subtitle:
      'Start your 30-day free trial today — no credit card required, no watermarks, no limits. One subscription covers your entire team.',
    tagline: "Choose the plan that's right for your church.",
  },
  plans: cloudPlans,
  includedHeading: 'Included with Every Plan',
  includedSubtitle:
    'No matter which tier you choose, every Cloud plan includes these core capabilities.',
  includedFeatures: cloudIncludedFeatures,
  compareHeading: 'Compare Plans',
  compareSubtitle: "See exactly what's included in each tier.",
  compareRows: cloudCompareRows,
  compareCategories: cloudCompareCategories,
  compareColumnLabels: {
    free: 'Free',
    starter: 'Essential',
    premium: 'Pro',
    enterprise: 'Enterprise',
  },
}

export const pricingProducts: Record<PricingProductId, PricingProductContent> = {
  'live-console': liveConsoleProduct,
  cloud: cloudProduct,
}

export function getPricingProduct(id: PricingProductId): PricingProductContent {
  return pricingProducts[id]
}

export const heroCopy = {
  badge: { label: 'NEW FEATURE RELEASE', version: 'V1.0.1 Complete Offline Capability' },
  badgeMobile: { label: 'NEW RELEASE', version: 'V1.0.1' },
  heading: {
    line1: 'Your church service,',
    line2: 'Powered by voice.',
  },
  body: "Meet Q-worship, The world's most powerful and complete church presentation platform, built by pastors for churches of all sizes .",
}

export const featuresHeroCopy = {
  badge: 'QWORSHIP FEATURES',
  heading: {
    accent: 'Everything',
    rest: 'your church needs',
  },
  body: "Q-worship brings together voice-powered Bible search, live projection, song management, multi integrations, and rich features — all built by pastors who've stood where you stand.",
  primaryCta: 'Download',
  secondaryCta: 'Get Started',
  image: '/Photos/features/Rectangle%2042300.webp',
}

export const featuresSubNavItems: FeaturesSubNavItem[] = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  { id: 'hands-free-bible', label: 'Hands-Free Bible', href: '#overview' },
  { id: 'on-screen-bible', label: 'On-screen Bible', href: '#on-screen-bible' },
  { id: 'songbook', label: 'Songbook', href: '#songbook' },
  { id: 'service-slides', label: 'Service Slides', href: '#service-slides' },
  { id: 'media', label: 'Media', href: '#media' },
  { id: 'lower-third-builder', label: 'Lower Third Builder', href: '#lower-third-builder' },
  { id: 'pricing', label: 'Pricing', href: '#pricing' },
]

export const handsFreeFeatureSpotlight: ChecklistSpotlightContent = {
  id: 'overview',
  title: {
    line1: 'Your Bible. Voice-first.',
    line2Before: 'Always ready,',
    accent: 'Online and Offline',
  },
  body: 'For ages, pastors have paused mid-sermon to wait for a verse. Q-worship ends that. Powered by our advanced speech-to-text engine, the Q-worship Hands-Free Bible listens as you lead, understanding natural language, retaining context, and instantly surfacing the exact scripture you need across major Bible translations.',
  checklist: [
    'Natural language processing for spoken references',
    "Session context retention — 'next verse', 'change to NIV' understood in context",
    'Full offline support — 31,406 verses cached locally across several Bible translations',
    "Sleep/wake commands ('thank you', 'amen' to dismiss)",
  ],
  cards: [
    {
      title: 'Voice Command Navigation',
      description:
        "Say a reference like 'John 3:16' or 'Psalm 23' and Q-worship finds it instantly. No typing, no clicking - just speak and the verse appears on screen.",
    },
    {
      title: 'Works Online and Offline',
      description:
        'No Wi Fi? No Problem. Q-worship is available in 2 usage modes - Online and Offline. Our voice Bible search works just as fast without internet as it does with internet.',
    },
    {
      title: 'Multiple Bible Versions',
      description:
        'Switch between all the major Bible translations- KJV, NKJV, MSG, AMP, GN, and NIV with a single voice command mid service. Your congregation hears the version that speaks to them',
    },
  ],
  image: '/Photos/feature%201.webp',
  imageAlt: 'Church auditorium with Bible verse on screen',
  showListeningOverlay: false,
}

export const onScreenBibleSpotlight: AccordionSpotlightContent = {
  id: 'on-screen-bible',
  header: {
    line1: 'Effortless Manual Search',
    line2Before: 'Q-worship,',
    accent: 'On-screen Bible',
  },
  subtitle: {
    line1: 'A powerful visual editor for searching, selecting, and projecting Bible content.',
    line2: 'Search all 66 books, select verse ranges, and see a live preview before you go live.',
  },
  items: [
    {
      id: 'search',
      title: 'Search Across All 66 Books',
      description:
        'Type any reference or keyword in our on-screen Bible editor and Q-worship searches all 31,406 verses across all 66 Books in seconds. Enjoy flexible search, find the right verse before the congregation notices.',
    },
    {
      id: 'range',
      title: 'Surrounding Verse Range',
      description:
        'Select a single verse or expand to surrounding context with one click. Preview the full passage range before projecting so your congregation always sees the right amount of scripture.',
    },
    {
      id: 'versions',
      title: 'Version Navigation',
      description:
        'Switch between KJV, NKJV, NIV, MSG, ESV, NASB, NLT and more without leaving the editor. Your selected passage updates instantly across every translation you need.',
    },
  ],
  image: '/Photos/features/3.webp',
  imageAlt: 'On-screen Bible editor interface',
}

export const postPastorsAccordionSpotlight: AccordionSpotlightContent = {
  id: 'hands-free-accordion',
  header: {
    line1: 'Effortless Manual Search',
    line2Before: 'Q-worship,',
    accent: 'On-screen Bible',
  },
  subtitle: {
    line1: 'A powerful visual editor for searching, selecting, and projecting Bible content.',
    line2: 'Search all 66 books, select verse ranges, and see a live preview before you go live.',
  },
  items: [
    {
      id: 'search',
      title: 'Search Across All 66 Books',
      description:
        'Type any reference or keyword in our on-screen Bible editor and Q-worship searches all 31,102 verses across all 66 Books in seconds. Enjoy flexible search, find the right verse before the congregation notices.',
    },
    {
      id: 'range',
      title: 'Surrounding Verse Range',
      description:
        'Select a single verse or expand to surrounding context with one click. Preview the full passage range before projecting so your congregation always sees the right amount of scripture.',
    },
    {
      id: 'versions',
      title: 'Version Navigation',
      description:
        'Switch between KJV, NKJV, NIV, MSG, ESV, NASB, NLT and more without leaving the editor. Your selected passage updates instantly across every translation you need.',
    },
  ],
  image: '/Photos/features/ghgh.webp',
  imageAlt: 'Church auditorium with Philippians 4:13 on screen',
}

export const moreFeaturesAccordionSpotlight: AccordionSpotlightContent = {
  id: 'on-screen-bible-showcase',
  header: {
    line1: 'Effortless Manual Search',
    line2Before: 'Q-worship,',
    accent: 'On-screen Bible',
  },
  subtitle: {
    line1: 'A powerful visual editor for searching, selecting, and projecting Bible content.',
    line2: 'Search all 66 books, select verse ranges, and see a live preview before you go live.',
  },
  items: [
    {
      id: 'search',
      title: 'Search Across All 66 Books',
      description:
        'Type any reference or keyword in our on-screen Bible editor and Q-worship searches all 31,406 verses across all 66 Books in seconds. Enjoy flexible search, find the right verse before the congregation notices.',
    },
    {
      id: 'range',
      title: 'Surrounding Verse Range',
      description:
        'Select a single verse or expand to surrounding context with one click. Preview the full passage range before projecting so your congregation always sees the right amount of scripture.',
    },
    {
      id: 'versions',
      title: 'Version Navigation',
      description:
        'Switch between KJV, NKJV, NIV, MSG, ESV, NASB, NLT and more without leaving the editor. Your selected passage updates instantly across every translation you need.',
    },
  ],
  image: '/Photos/features/ghgh.webp',
  imageAlt: 'Church auditorium with Philippians 4:13 on screen',
}

export const songbookFeatureSpotlight: ChecklistSpotlightContent = {
  id: 'songbook',
  title: {
    line1: 'Every lyric. Every section.',
    line2Before: '',
    accent: 'Always one click ahead.',
    gradientLine: 1,
  },
  body: "Q-worship's Songbook is a complete song management and live projection system built for worship teams. Build your library once, import from any format, and navigate every verse, chorus, and bridge with a single click — while your congregation sees perfectly formatted lyrics on the big screen in real time.",
  checklist: [
    'Section-based navigation — Verse, Chorus, Bridge, Pre-Chorus, Tag, Intro, Outro',
    'Real-time sync between control and projection windows',
    'Song import from TEXT, PDF, and DOCX files',
    'Easy to use song editor with undo/redo',
  ],
  cards: [
    {
      title: 'Section-Based Navigation',
      description:
        'Move through Verse, Chorus, Bridge, Tag, Intro, and Outro with a single click. Your worship leader always knows exactly where they are in the song — and the projection screen follows instantly, with zero lag.',
    },
    {
      title: 'Import from Any Format',
      description:
        'Already have your songs in Word, PDF, or plain text? Bring them straight in. Qworship parses your existing files and structures them into sections automatically — no manual re-entry, no copy-pasting, no starting from scratch.',
    },
    {
      title: 'Sing-Along Pace Setter',
      description:
        "Keep your congregation singing in sync with the Sing-Along Pace Setter — a real-time lyric progress indicator that highlights the current line as it's being sung. No more congregation falling behind or jumping ahead.",
    },
  ],
  image: '/Photos/features/song.webp',
  imageAlt: 'Amazing Grace lyrics projected over a mountain landscape',
  showListeningOverlay: false,
}

export const prePastorsHandsFreeSpotlight: ChecklistSpotlightContent = {
  id: 'hands-free-bible',
  title: {
    line1: 'Your Bible. Hands-free.',
    line2Before: 'Always ready,',
    accent: 'Online and Offline',
  },
  body: 'For ages, pastors have paused mid-sermon to wait for a verse. Q-worship ends that. Powered by our advanced speech-to-text engine, the Q-worship Hands-Free Bible listens as you lead, understanding natural language, retaining context, and instantly surfacing the exact scripture you need across major Bible translations.',
  checklist: [
    'Natural language processing for spoken references',
    "Session context retention — 'next verse', 'change to NIV' understood in context",
    'Full offline support — 31,406 verses cached locally across several Bible translations',
    "Sleep/wake commands ('thank you', 'amen' to dismiss)",
  ],
  cards: [
    {
      title: 'Voice Command Navigation',
      description:
        "Say a reference like 'John 3:16' or 'Psalm 23' and Q-worship finds it instantly. No typing, no clicking - just speak and the verse appears on screen.",
    },
    {
      title: 'Works Online and Offline',
      description:
        'No Wi Fi? No Problem. Q-worship is available in 2 usage modes - Online and Offline. Our voice Bible search works just as fast without internet as it does with internet.',
    },
    {
      title: 'Multiple Bible Versions',
      description:
        'Switch between all the major Bible translations- KJV, NKJV, MSG, AMP, GNT, and NIV with a single voice command mid service. Your congregation hears the version that speaks to them',
    },
  ],
  image: '/Photos/features/song.webp',
  imageAlt: 'Amazing Grace lyrics projected over a mountain landscape',
  showListeningOverlay: true,
}

export const serviceSlidesAccordionSpotlight: AccordionSpotlightContent = {
  id: 'service-slides',
  header: {
    line1: 'Build your entire service.',
    line2Before: '',
    accent: 'Slide by slide. In minutes.',
  },
  subtitle: {
    line1:
      "Qworship's Service Slides system lets you build a complete order of service — announcements, scripture, song lyrics, videos, image slides, and custom canvas slides — all in one place. Every item is a slide. Every slide is live-ready. And when it's time to go, one click puts it all on screen.",
    line2: '',
  },
  items: [
    {
      id: 'builder',
      title: 'Drag-and-Drop Service Builder',
      description:
        'Organise your entire service into sections — Pre-Service, Warm-Up, Service Items, and Post-Service Loop — and populate each one with songs, Bible verses, announcements, videos, image slides, or custom canvas slides. Your service order is always exactly how you want it.',
    },
    {
      id: 'canvas',
      title: 'Custom Slide Canvas',
      description:
        'Design bespoke slides directly inside Qworship with the built-in Slide Canvas editor. Add headlines, subheadings, body text, images, and QR codes — then position every element exactly where you want it. No external design tool needed; your custom slides live right alongside your scripture and song content.',
    },
    {
      id: 'preview',
      title: 'Live Preview Before You Go Live',
      description:
        'Every slide in your service generates a real-time preview before it hits the big screen. See exactly what your congregation will see — background, text, layout, and all — before you click GO LIVE. No wrong slides. No awkward corrections. No surprises mid-service.',
    },
  ],
  image: '/Photos/feature%203.webp',
  imageAlt: 'Service Slides canvas editor with Easter slide preview',
}

export const serviceSlidesSpotlight: ChecklistSpotlightContent = {
  id: 'service-slides',
  title: {
    line1: 'Your Service.',
    line2Before: '',
    accent: 'Fully in Your Hands.',
  },
  body: buildTabItems.find((tab) => tab.id === 'service')!.description,
  checklist: buildTabItems.find((tab) => tab.id === 'service')!.features.slice(0, 4),
  cards: [
    {
      title: 'Unified Service Order',
      description:
        'Your songs, scriptures, announcements and media — all in one place, all in the right order, all ready to go live the moment you need them.',
    },
    {
      title: 'Reorder On the Fly',
      description:
        'Reorder items on the fly without losing your work. Navigate your whole service with simple keyboard shortcuts.',
    },
    {
      title: 'Auto-Save & Resume',
      description:
        'Your service saves automatically, every step of the way. Pick up exactly where you left off, every time.',
    },
  ],
  image: '/Photos/Service%20order.webp',
  imageAlt: 'Service order management interface',
}

export const mediaAccordionSpotlight: AccordionSpotlightContent = {
  id: 'media',
  header: {
    line1: 'The right background for every verse, song or',
    line2Before: 'announcement.',
    accent: 'Found in seconds, not minutes.',
  },
  subtitle: {
    line1:
      "Qworship's dual-layer Media Library gives your team instant access to a curated collection of platform-provided worship\nbackgrounds and motion videos, alongside every asset your church has ever uploaded.\nOne searchable, tag-organised library — so the right visual is always one click away,\nnever buried in a folder somewhere.",
    line2: '',
  },
  items: [
    {
      id: 'cloud-assets',
      title: 'Cloud + Your Own Assets',
      description:
        'Browse a built-in library of professionally curated worship backgrounds, motion videos, and seasonal templates — or upload your own images, videos, and audio files. Everything lives in one place, searchable and filterable, so your operator never has to leave Qworship to find what they need.',
    },
    {
      id: 'tags',
      title: 'Advanced Tag System & Collections',
      description:
        'Tag every asset by mood, colour, season, theme, or service item type. Filter by category, browse by collection, and find the right background in seconds — even with hundreds of assets in your library. The more your library grows, the faster you find things.',
    },
    {
      id: 'thumbnails',
      title: 'Video Thumbnail Generation',
      description:
        'Every video file you upload automatically generates a visual thumbnail using FFmpeg. Browse your entire motion background library visually — no playing files one by one to find the right one. What you see is exactly what you get on screen.',
    },
  ],
  image: '/Photos/feature%204.png',
  imageAlt: 'Media library background picker with Matthew 8:20 verse preview',
}

export const mediaFeatureSpotlight: ChecklistSpotlightContent = {
  id: 'media',
  title: {
    line1: 'Keep Your Church',
    line2Before: '',
    accent: 'In the Loop',
  },
  body: buildTabItems.find((tab) => tab.id === 'announcements')!.description,
  checklist: buildTabItems.find((tab) => tab.id === 'announcements')!.features.slice(0, 4),
  cards: [
    {
      title: 'In-Service Announcements',
      description:
        'Slide your announcements, countdowns and notices straight into your service — no switching apps, no second screen, no interruptions.',
    },
    {
      title: 'Countdown Timers',
      description:
        'Add a countdown so your congregation knows when things start. Customise the look to match your church\'s style.',
    },
    {
      title: 'Seamless Transitions',
      description:
        'Move seamlessly from announcements into worship. Everything on one screen, always under your control.',
    },
  ],
  image: '/Photos/Announcements.webp',
  imageAlt: 'Announcements and media projection interface',
}

export const lowerThirdBuilderSpotlight: ChecklistSpotlightContent = {
  id: 'lower-third-builder',
  title: {
    line1: 'Professional broadcast Lower Third.',
    line2Before: '',
    accent: 'Built right in. No extra software.',
  },
  body: "Qworship's In-Built Lower Third Builder lets you create, style, and display broadcast-quality lower thirds — speaker names, scripture references, song titles, announcements — directly from inside the platform. No After Effects, no external graphics software, no extra operator. Your stream and your in-room display look professional from the very first service.",
  checklist: [
    'Built-in lower third editor — no external software needed',
    'Custom text, colours, fonts, and logo support',
    'Live push to projection screen and OBS simultaneously',
    'Syncs with service order for seamless live operation',
  ],
  cards: [
    {
      title: 'Design Without Leaving Qworship',
      description:
        "Build lower thirds directly inside Qworship using the built-in editor. Add speaker names, titles, scripture references, or any custom text — then style them with your church's colours, fonts, and logo. No external design tool, no file exports, no switching between apps mid-service.",
    },
    {
      title: 'Live Display on Screen and Stream',
      description:
        'Push your lower thirds to the projection screen and OBS simultaneously with one click. What your in-room congregation sees is exactly what your online audience sees — branded, consistent, and perfectly timed to the moment it\'s needed.',
    },
    {
      title: 'Instant Recall During Service',
      description:
        'Save your most-used lower thirds — speaker names, sermon series titles, recurring announcements — and recall them instantly during a live service. No rebuilding from scratch each week. Your graphics are ready before your worship team arrives.',
    },
  ],
  image: '/Photos/features/song.webp',
  imageAlt: 'Amazing Grace lyrics projected over a mountain landscape',
  showListeningOverlay: false,
}

export const guideCards: GuideCard[] = [
  {
    id: 'live-console-first-sunday',
    categoryId: 'general',
    title: 'Setting up Q-worship Live Console for your first Sunday',
    description:
      'Connect your displays, walk through the Live Console layout, and run a quick test so your team is ready before the congregation arrives.',
    image: '/Photos/Guides/SUQL.webp',
    imageAlt: 'Q-worship Live Console welcome and Hands-Free Bible walkthrough',
    article: {
      title: {
        line1: 'Your first Sunday.',
        line2Before: 'Set up the Live Console with',
        accent: 'confidence.',
      },
      body: 'The Live Console is where your operator runs the entire service — scripture, lyrics, announcements, and media from one screen. Start by connecting your main and stage displays, then open a sample service order to familiarise your team with the GO LIVE workflow. A five-minute test run on Saturday saves every awkward pause on Sunday morning.',
    },
    steps: {
      summary: 'A step-by-step walkthrough for your first live service — from install to wrap-up.',
      sections: [
        {
          id: 'before-the-service',
          label: 'Before the Service',
          description:
            "Arrive at least 30 minutes before the service starts. These steps take under 10 minutes once you've done them once — but give yourself time the first week.",
          steps: [
            {
              id: 'download-and-install',
              title: 'Download and Install Q-worship',
              body: 'Download the Q-worship Live Console installer for your operating system (Windows or macOS) from Q-worship.com/download. Run the installer and follow the on-screen prompts. The app installs in under two minutes and requires no server setup.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Windows 10/11 (64-bit) or macOS 11+',
                    'Minimum 4GB RAM, 2GB free disk space',
                    'Internet connection for first-time Bible data download',
                    'Projector or secondary display connected',
                  ],
                },
              ],
            },
            {
              id: 'launch-and-login',
              title: 'Launch Q-worship and Login',
              body: 'Open Q-worship Live Console. Sign in with your church account credentials. If your church is on a free trial, your account was created when you registered — check your email for the welcome message with your login link.',
              blocks: [
                {
                  type: 'tip',
                  body: "If you're the first person setting up Q-worship for your church, you'll be prompted to create your Organisation during first login. Enter your church name, denomination, and approximate congregation size — this helps Q-worship tailor the experience.",
                },
              ],
            },
            {
              id: 'select-usage-mode',
              title: 'Select Your Usage Mode',
              body: 'Go to Settings > Usage Mode. Select between the Offline mode and the Online mode depending on your preferences and circumstances.',
              blocks: [
                {
                  type: 'modes',
                  items: [
                    {
                      label: 'Offline Mode',
                      body: 'Offline mode is the recommended default for local resilience and fast service-time Bible access. In noisier rooms or with weaker microphones, recognition quality will still depend on microphone placement and speech clarity.',
                    },
                    {
                      label: 'ONLINE MODE',
                      body: 'A stable internet connection is needed for online mode to ensure you get the best results for your Q-worship Hands-free Bible. The speed and quality of the hands-free Bible is dependent on the quality of your internet connection.',
                    },
                  ],
                },
              ],
            },
            {
              id: 'configure-microphone',
              title: 'Configure Your Microphone (Hands-free Bible)',
              body: "Go to Settings > Audio Settings. Select the microphone your pastor will use — this can be a USB mic, a feed from your soundboard via a virtual audio device, or sound card, a dedicated lapel mic connected to the operator's machine. Speak a verse reference aloud and confirm the voice transcription display shows the text in real time.",
              blocks: [
                {
                  type: 'tip',
                  body: "Q-worship's voice engine understands natural language. Your pastor just needs to say 'John chapter 3 verse 16' or 'John 3:16'. The system retains session context, so 'next verse' and 'change to NIV' are understood mid-service.",
                },
                {
                  type: 'warning',
                  body: 'The quality of your audio input is the single biggest factor in detection accuracy. If your soundboard feed is too loud or too quiet, the voice engine will struggle. Aim for a waveform that peaks at around 60-70% of the visualizer height — not clipping, not whispering.',
                },
              ],
            },
            {
              id: 'setup-projection-display',
              title: 'Set-up Your Projection Display for Go-Live',
              body: "Connect your projector or secondary display to the operator's machine. In Q-worship, go to Settings > Display and select your projection screen as the output. Click 'Test Display' — a full-screen test slide should appear on the projection screen. If nothing appears, check your OS display settings to confirm the second screen is detected.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Projector or TV connected and powered on',
                    'OS display settings: extended display (not mirror)',
                    'Q-worship output set to the correct screen',
                    'Test audience screen and lower third is confirmed visible on projection screen',
                  ],
                },
              ],
            },
            {
              id: 'load-songs',
              title: 'Load Your Songs to Songbook',
              body: "Go to the Songbook tab. If your church already has songs in Word or PDF format, click Import and select your files — Q-worship parses them into sections automatically. If you're starting fresh, use the built-in WYSIWYG editor to add your worship set songs. Organise each song into sections: Verse 1, Chorus, Bridge, etc.",
              blocks: [
                {
                  type: 'tip',
                  body: "Q-worship's voice engine understands natural language. Your pastor just needs to say 'John chapter 3 verse 16' or 'John 3:16'. The system retains session context, so 'next verse' and 'change to NIV' are understood mid-service.",
                },
              ],
            },
          ],
        },
        {
          id: 'during-the-service',
          label: 'During the Service',
          description:
            "Once you're live, the console does the heavy lifting. Follow these steps to keep scripture, songs, and slides moving without a hitch.",
          steps: [
            {
              id: 'go-live',
              title: 'Go Live',
              body: 'Toggle GO LIVE from the Live Console to start sending output to the projector. A status indicator confirms the audience display is active before you begin.',
            },
            {
              id: 'follow-hands-free-bible',
              title: 'Follow Along with the Hands-Free Bible',
              body: 'When your pastor references a verse aloud, Q-worship listens, matches the reference, and puts it on screen automatically — no typing, no searching mid-sermon.',
            },
            {
              id: 'switch-songs-scripture',
              title: 'Switch Between Songs and Scripture',
              body: 'Use the Bible, Songs, and Slides tabs to move between service elements without breaking the flow. Each tab remembers your last position so transitions stay smooth.',
            },
            {
              id: 'handle-changes',
              title: 'Handle Last-Minute Changes',
              body: 'If the order changes on the fly, drag any item to a new position in the queue or search for a new song or verse directly — the audience display updates the moment you confirm.',
            },
          ],
        },
        {
          id: 'after-the-service',
          label: 'After the Service',
          description: 'Wrapping up well makes next Sunday easier. A few minutes now saves guesswork later.',
          steps: [
            {
              id: 'exit-live',
              title: 'Exit Live and Review',
              body: 'Select EXIT LIVE to end output cleanly. Q-worship logs the songs and scriptures used so you can reference them for next week’s planning.',
            },
            {
              id: 'save-order',
              title: "Save This Week's Service Order",
              body: "Save the current order as a template if it worked well, so next Sunday's setup starts from a working baseline instead of a blank slate.",
            },
            {
              id: 'note-fixes',
              title: 'Note Any Fixes for Next Time',
              body: 'Jot down anything that needs adjusting — mic levels, display timing, song order — directly in the service notes so your team can improve before the next service.',
            },
          ],
        },
      ],
    },
    cloudSteps: {
      summary: 'A step-by-step walkthrough for building and running your first service entirely from the browser.',
      sections: [
        {
          id: 'before-the-service',
          label: 'Before the Service',
          description:
            "Q-worship Cloud runs entirely in your browser — no installation required. You'll need a stable internet connection and a machine connected to your projection screen.",
          steps: [
            {
              id: 'log-in-cloud',
              title: 'Log In to Q-worship Cloud',
              body: 'Open your browser and go to app.qworship.com. Sign in with your church account. Q-worship Cloud works in Chrome, Edge, and Firefox — we recommend Chrome for the best performance. No plugins or extensions required.',
              blocks: [
                {
                  type: 'tip',
                  body: "Bookmark app.qworship.com on your operator's machine so it's one click away on Sunday morning.",
                },
              ],
            },
            {
              id: 'create-presentation',
              title: 'Create Your Service Presentation',
              body: "From the Dashboard, click 'New Presentation' and give it a name (e.g. 'Sunday 6 July 2025'). You'll be taken to the Service Builder — a full-screen editor where you add, arrange, and design every element of your service.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Pre-Service loop slides',
                    'Opening / Welcome',
                    'Worship songs with lyrics',
                    'Sermon scripture slides',
                    'Announcements',
                    'Offering / Giving slide',
                    'Closing',
                  ],
                },
              ],
            },
            {
              id: 'add-songs-songbook',
              title: 'Add Songs from the Songbook',
              body: "Click 'Add Item' and select 'Song'. Search your church's song library or import a new song from a Word, PDF, or text file. Q-worship parses the file and structures it into sections automatically. Arrange sections (Verse 1, Chorus, Bridge, Tag) in the order your worship leader will use them.",
            },
            {
              id: 'add-scripture-slides',
              title: 'Add Scripture Slides',
              body: "Click 'Add Item' and select 'Bible Verse'. Search by reference (e.g. 'Romans 8:28') or keyword. Select your translation (KJV, NKJV, NIV, ESV, AMP, or MSG) and choose whether to display a single verse or a range. The verse appears as a formatted slide with your chosen background.",
              blocks: [
                {
                  type: 'tip',
                  body: 'You can add multiple translations of the same verse as separate slides — useful for churches that like to show the congregation two versions side by side.',
                },
              ],
            },
            {
              id: 'design-slides-canvas',
              title: 'Design Your Slides with the Canvas Editor',
              body: "For custom slides (announcements, welcome screens, sermon series titles), click 'Add Item' and select 'Custom Slide'. The built-in Slide Canvas editor lets you add text, images, QR codes, and position every element exactly where you want it. Choose a background from the Cloud Media Library or upload your own.",
            },
            {
              id: 'choose-backgrounds',
              title: 'Choose Backgrounds from the Media Library',
              body: 'Click any slide and open the Background panel. Browse the Cloud Media Library — a curated collection of worship backgrounds, motion videos, and seasonal templates — or upload your own images and videos from My Media Library. Advanced tag filtering makes it easy to find the right background in seconds.',
              blocks: [
                {
                  type: 'tip',
                  body: 'Tag your own uploaded assets by mood, colour, season, or theme. The more organised your library, the faster your Sunday morning setup becomes.',
                },
              ],
            },
            {
              id: 'connect-obs',
              title: 'Connect OBS Studio (Optional)',
              body: "If you're streaming your service online, go to Settings > Integrations > OBS Studio. Enter your OBS WebSocket server address and password. Q-worship can start/stop your stream, switch OBS scenes, and sync your presentation content to OBS in real time — all from inside the platform.",
              blocks: [
                {
                  type: 'warning',
                  body: 'OBS integration requires OBS Studio 28+ with the WebSocket plugin enabled. See the OBS Setup Guide for step-by-step connection instructions.',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'no-need-to-type-announcements',
    categoryId: 'general',
    title: 'Setting Up Your Audio Devices',
    description:
      'Connect your soundboard, lapel mic, USB microphone, or media board for the best Hands-Free Bible accuracy. Includes mic switching during service.',
    heroBody:
      'The Hands-Free Bible is only as good as the microphone feeding it. This guide covers every connection method — from USB mics to full soundboard setups — so your voice detection works perfectly every Sunday.',
    image: '/Photos/Guides/SUYD.webp',
    imageAlt: 'Q-worship audio and content settings interface',
    article: {
      title: {
        line1: 'Clear audio.',
        line2Before: 'Accurate detection,',
        accent: 'every time.',
      },
      body: "The Hands-Free Bible only works as well as the signal it receives. This guide walks you through every connection method — lapel mics, soundboard feeds, USB microphones, and virtual audio devices — so your voice detection is rock-solid before your pastor ever steps to the pulpit.",
    },
    steps: {
      summary: 'A step-by-step walkthrough for connecting and configuring your audio devices.',
      sections: [
        {
          id: 'choosing-your-audio-source',
          label: 'Choosing Your Audio Source',
          description:
            'The Hands-Free Bible is only as good as the microphone feeding it. The single most impactful thing you can do for voice detection accuracy is choose the right audio source.',
          steps: [
            {
              id: 'understand-mic-quality',
              title: 'Understand Why Mic Quality Matters',
              body: "Q-worship's speech-to-text engine processes the raw audio signal from your selected microphone. If the signal is clear, close, and free from background noise, verse detection accuracy is extremely high. If the signal is distant, reverberant, or noisy, accuracy drops significantly. The engine cannot compensate for poor audio — it can only work with what it receives.",
              blocks: [
                {
                  type: 'tip',
                  body: "Think of it this way: if a human listener couldn't clearly understand the reference from the audio, neither can Q-worship. The standard is the same.",
                },
              ],
            },
            {
              id: 'choose-mic-type',
              title: 'Choose the Right Microphone Type',
              body: "Different microphone types suit different church setups. Here's how to choose:",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "Lapel / lavalier mic — Best option. Clips to the speaker's clothing, stays close to the mouth regardless of head movement. Feeds through the sound board.",
                    'Handheld mic — Good option. Held close to the mouth. Feeds through the sound board.',
                    'Headset mic — Excellent option. Stays at a fixed distance from the mouth. Feeds through the sound board.',
                    "USB desk mic — Good for small churches or home offices. Plug directly into the operator's computer.",
                    'Condenser mic on a stand — Works well if positioned close (within 30cm) to the speaker.',
                    'Room mic or ambient mic — NOT recommended. Too much distance and background noise.',
                  ],
                },
                {
                  type: 'warning',
                  body: "Never use the built-in microphone on the operator's laptop or desktop computer unless the operator is sitting directly next to the speaker. The distance and ambient noise will severely impact accuracy.",
                },
              ],
            },
            {
              id: 'decide-signal-routing',
              title: 'Decide How to Route the Signal',
              body: "If your pastor's microphone goes through a sound board (mixing desk), you have two options for getting that signal to Q-worship: (1) Take a direct output or aux send from the sound board into your computer's audio interface or sound card. (2) Use a virtual audio device (VoiceMeeter on Windows, Loopback on macOS) to route the audio digitally. Option 1 gives the cleanest signal. Option 2 is more flexible but requires additional software setup.",
              blocks: [
                {
                  type: 'tip',
                  body: "Ask your sound engineer to send a clean, pre-EQ, pre-effects feed of the pastor's mic to the Q-worship computer. You want the raw voice signal, not the processed version with reverb or compression applied.",
                },
              ],
            },
            {
              id: 'soundboard-connections',
              title: 'Soundboard, Soundcard, and Media Board Connections',
              body: 'Here are the four most common physical connection methods:',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "XLR to audio interface: Run an XLR cable from the sound board's aux send or direct output to an audio interface (e.g. Focusrite Scarlett, Behringer UMC). Connect the interface to the operator's computer via USB. Select the interface as the input in Q-worship Audio Settings.",
                    "TRS/TS to sound card: Use a 3.5mm TRS or 6.35mm TS cable from the sound board's headphone out or aux send to the computer's line-in jack. Select 'Line In' in Q-worship Audio Settings.",
                    "Virtual audio device (VoiceMeeter / Loopback): Install VoiceMeeter (Windows, free) or Loopback (macOS, paid). Route the audio from your interface or sound card through the virtual device. Select the virtual device output in Q-worship Audio Settings.",
                    "USB microphone direct: Plug a USB microphone directly into the operator's computer. Select it by name in Q-worship Audio Settings.",
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'connecting-and-configuring',
          label: 'Connecting & Configuring',
          description:
            "Once you've chosen your audio source, connect it to your computer and configure Q-worship to use it. This takes about 5 minutes.",
          steps: [
            {
              id: 'connect-audio-device',
              title: 'Connect Your Audio Device',
              body: "Connect your microphone or audio interface to the operator's computer. For USB devices, plug in and wait for the operating system to recognise the device (usually 10-30 seconds). For audio interfaces, install the manufacturer's driver first if required. For virtual audio devices, install VoiceMeeter or Loopback and configure the routing before opening Q-worship.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Always connect your audio device before opening Q-worship. If you connect it after, you may need to restart Q-worship for the new device to appear in the Audio Settings dropdown.',
                },
              ],
            },
            {
              id: 'select-input-audio-settings',
              title: 'Select the Input in Q-worship Audio Settings',
              body: "Open Q-worship and go to Settings > Audio Input. Click the dropdown and you'll see every audio input device currently connected to your computer. Select the device that carries your pastor's microphone signal. The name will match the device name shown in your operating system's sound settings.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "USB mic: appears by its product name (e.g. 'Blue Yeti', 'Rode NT-USB')",
                    "Audio interface: appears as the interface name (e.g. 'Scarlett 2i2 USB', 'UMC202HD')",
                    "Virtual device: appears as 'VoiceMeeter Output', 'Loopback Audio', etc.",
                    "Built-in mic: appears as 'Built-in Microphone' or 'Internal Microphone'",
                    "Sound card line-in: appears as 'Line In' or 'Stereo Mix'",
                  ],
                },
              ],
            },
            {
              id: 'assign-speaker-microphone',
              title: "Assign the Speaker's Microphone",
              body: "If your pastor uses a specific microphone that is different from the worship team's microphones, make sure that mic's signal is what's routed to Q-worship. During a service, you can switch the active microphone in Q-worship's Audio Settings without interrupting the session — useful if multiple speakers are preaching or if the pastor switches between a lapel and a handheld.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Create a pre-service checklist: before every service, verify that the correct microphone is selected in Q-worship Audio Settings. It takes 10 seconds and prevents the most common cause of missed verse detections.',
                },
              ],
            },
            {
              id: 'set-input-level',
              title: 'Set the Input Level',
              body: 'After selecting your microphone, look at the waveform visualizer in Audio Settings. Have your pastor (or a team member standing at the pulpit) speak at their normal preaching volume. The waveform peaks should reach 60-70% of the visualizer height. If peaks are too low (below 40%), increase the input gain on your audio interface or sound board. If peaks are constantly at 100% (clipping), reduce the gain.',
              blocks: [
                {
                  type: 'warning',
                  body: 'Audio clipping — where the signal is too loud and distorts — is just as damaging to voice detection as audio that is too quiet. Clipped audio sounds distorted to the speech engine and causes missed or incorrect detections.',
                },
              ],
            },
          ],
        },
        {
          id: 'testing-and-optimising',
          label: 'Testing & Optimising',
          description:
            "Before your first Sunday, run a full audio test with the actual microphone in the actual position it will be used during the service. Don't test at the operator's desk — test at the pulpit.",
          steps: [
            {
              id: 'run-full-voice-test',
              title: 'Run a Full Voice Test',
              body: 'With Q-worship open and Hands-Free Bible mode active, have your pastor (or a team member) stand at the pulpit and speak several Bible references clearly at normal preaching volume. Watch the voice transcription display — you should see the spoken words appear as text within 1-2 seconds, and the verse should appear on screen. Test at least 10 different references across different books.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "Say 'John 3:16' — should appear within 2 seconds",
                    "Say 'Psalm 23 verse 1' — tests natural language",
                    "Say 'Romans chapter 8 verse 28' — tests verbose format",
                    "Say 'next verse' — tests session context",
                    "Say 'change to NIV' — tests translation switching",
                    "Say 'thank you' — tests sleep command",
                    "Say 'Genesis 1:1' — tests Old Testament",
                  ],
                },
              ],
            },
            {
              id: 'diagnose-fix-issues',
              title: 'Diagnose and Fix Common Issues',
              body: 'If the test reveals problems, work through these fixes:',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Text appears in transcription but wrong verse shows: raise confidence threshold in Settings > Voice Detection',
                    'Text appears but no verse: check that Bible data has been downloaded for the selected translations',
                    'No text appears at all: microphone not sending signal — check connection and input selection',
                    'Text appears but is garbled: audio level too high (clipping) or too low — adjust input gain',
                    'Intermittent detection: background noise or distance issue — move mic closer or reduce ambient noise',
                    "Consistent wrong book: common with similar-sounding book names (e.g. 'John' vs 'Job') — speak more clearly or use the full reference",
                  ],
                },
                {
                  type: 'tip',
                  body: "Record a 2-minute audio clip of the test using your computer's voice recorder app. Listen back to the recording — if you can clearly understand every word, Q-worship should too. If the recording sounds distant, muffled, or noisy, fix the audio before Sunday.",
                },
              ],
            },
            {
              id: 'optimise-for-environment',
              title: 'Optimise for Your Environment',
              body: 'Every church is different. Here are environment-specific optimisations:',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Large sanctuary with reverb: use a close-mic lapel or headset — never a room mic',
                    'Outdoor service: use a directional (cardioid) microphone and shield it from wind',
                    "Multiple speakers in one service: assign each speaker's mic in Audio Settings and switch before they begin speaking",
                    'Live band playing during sermon: activate Hands-Free mode only during the sermon, not during worship',
                    "Noisy HVAC or ambient noise: position the mic as close to the speaker's mouth as possible to improve signal-to-noise ratio",
                    'Small chapel or quiet room: almost any microphone works — even a USB desk mic on the pulpit',
                  ],
                },
                {
                  type: 'warning',
                  body: 'Do not run Hands-Free Bible mode during worship songs unless your pastor is also preaching during that time. The engine will attempt to match sung lyrics to Bible verses, which wastes transcription credits and may project unintended content.',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'no-need-to-type-stage',
    categoryId: 'general',
    title: 'No Need to Type. Just Speak.',
    description:
      'How the Hands-Free Bible works, how to set it up, and how to get the best results during a live sermon. Includes voice command reference.',
    heroBody:
      'Stay in the moment. Just say the reference out loud — Q-worship hears you, finds the verse, and puts it on screen. No pausing, no searching, no breaking your stride at the pulpit.',
    image: '/Photos/Guides/NTJS.webp',
    imageAlt: 'Pastor speaking with live Hands-Free Bible verse detection on screen',
    article: {
      title: {
        line1: 'Your Bible. Hands-free.',
        line2Before: 'Always ready,',
        accent: 'Online and Offline',
      },
      body: 'For ages, pastors have paused mid-sermon to wait for a verse. Q-worship ends that. Powered by our advanced speech-to-text engine, the Q-worship Hands-Free Bible listens as you lead, understanding natural language, retaining context, and instantly surfacing the exact scripture you need across major Bible translations.',
    },
    steps: {
      summary: 'A step-by-step walkthrough for setting up and running the Hands-Free Bible.',
      sections: [
        {
          id: 'setting-it-up',
          label: 'Setting It Up',
          description:
            "Getting the Hands-Free Bible working takes about 5 minutes. The most important decision you'll make is which microphone to use — everything else follows from that.",
          steps: [
            {
              id: 'open-audio-settings',
              title: 'Open Audio Settings',
              body: "In Q-worship, go to Settings > Audio Input. You'll see a dropdown list of every audio input device connected to your machine — USB microphones, built-in mics, virtual audio devices, and audio interface inputs. This is where you tell Q-worship which microphone to listen to.",
              blocks: [
                {
                  type: 'tip',
                  body: "If you don't see your microphone in the list, check that it's physically connected and that your operating system has granted Q-worship microphone permission (macOS: System Preferences > Privacy & Security > Microphone; Windows: Settings > Privacy > Microphone).",
                },
              ],
            },
            {
              id: 'select-your-microphone',
              title: 'Select Your Microphone',
              body: "Choose the microphone your pastor or speaker will use. This is typically the lapel mic or handheld mic that goes through your sound board — not the room microphone or the operator's machine microphone. If your sound board sends a feed to the computer, select the virtual audio device (e.g. VoiceMeeter Output, Loopback, or your audio interface) that carries that feed.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "Lapel mic (best — closest to the speaker's mouth)",
                    'Handheld mic via sound board feed',
                    "USB microphone on the operator's desk",
                    'Audio interface input (XLR mic → interface → computer)',
                    'Virtual audio device (VoiceMeeter, Loopback, etc.)',
                  ],
                },
                {
                  type: 'warning',
                  body: 'Do NOT select the room microphone or a microphone positioned far from the speaker. Distance and ambient noise are the two biggest causes of missed verse detections.',
                },
              ],
            },
            {
              id: 'check-waveform-visualizer',
              title: 'Check the Waveform Visualizer',
              body: "Once you've selected your microphone, speak into it and watch the waveform visualizer in the Audio Settings panel. You should see the waveform respond clearly to speech — peaks that reach roughly 60-70% of the visualizer height when speaking at a normal sermon volume. If the waveform is flat, your microphone isn't sending signal. If it's constantly clipping (hitting the top), the input level is too high.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Have your pastor or a team member speak a few Bible references into the mic at their normal preaching volume — not a quiet test voice. The voice engine is calibrated for normal speech, not whispers.',
                },
              ],
            },
            {
              id: 'select-bible-translations',
              title: 'Select Your Bible Translations',
              body: "Go to Settings > Bible Translations and enable the translations your pastor uses. Q-worship supports KJV, NKJV, NIV, ESV, AMP, and MSG. Set your pastor's primary translation as the default — this is the version that will appear on screen when a verse is detected. All 31,406 verses are cached locally, so Bible search works even without an internet connection once downloaded.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'KJV — King James Version',
                    'NKJV — New King James Version',
                    'NIV — New International Version',
                    'ESV — English Standard Version',
                    'AMP — Amplified Bible',
                    'MSG — The Message',
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'using-it-live',
          label: 'Using It Live',
          description:
            'Once the service begins, the Hands-Free Bible is designed to disappear into the background. Your pastor preaches. Qworship listens. Verses appear.',
          steps: [
            {
              id: 'activate-hands-free-mode',
              title: 'Activate Hands-Free Mode',
              body: 'Click the microphone icon in the Q-worship top bar to activate Hands-Free Bible mode. A pulsing indicator confirms the system is listening. From this moment, any Bible verse reference your pastor speaks will appear on the projection screen within 2 seconds — no typing, no clicking, no operator intervention required.',
              blocks: [
                {
                  type: 'tip',
                  body: 'Activate Hands-Free mode just before the sermon begins — not during worship songs or announcements. The system is designed for spoken scripture, and running it during non-sermon segments uses transcription credits without benefit.',
                },
              ],
            },
            {
              id: 'how-natural-language-works',
              title: 'How Natural Language Works',
              body: "Q-worship's voice engine understands natural spoken language — your pastor doesn't need to announce references in any particular format. All of the following work: 'John 3:16', 'turn with me to John chapter 3 verse 16', 'John 3 and 16', 'the third chapter of John, verse 16'. The engine processes the meaning of what's said, not just exact phrasing.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "'John 3:16' — direct citation",
                    "'Turn to Romans 8:28' — navigational reference",
                    "'The next verse' — session context (continues from last reference)",
                    "'Change to NIV' — translation switch mid-sermon",
                    "'Read that again' — re-displays the current verse",
                  ],
                },
              ],
            },
            {
              id: 'session-context-retention',
              title: 'Session Context Retention',
              body: "Q-worship retains context throughout the sermon session. If your pastor says 'next verse' or 'verse 17', the system knows which book and chapter you're currently in and advances accordingly. If they say 'go back to that verse', it re-displays the last detected reference. This context resets when you deactivate and reactivate Hands-Free Mode.",
              blocks: [
                {
                  type: 'tip',
                  body: "Session context is one of the most powerful features for expository preaching — when your pastor is working through a chapter verse by verse, they can simply say 'verse 3', 'verse 4', 'verse 5' and Q-worship follows along without needing the full reference each time.",
                },
              ],
            },
            {
              id: 'sleep-and-wake-commands',
              title: 'Sleep and Wake Commands',
              body: "Use natural sleep/wake commands to pause and resume verse detection without touching the keyboard. Say 'thank you' or 'amen' to dismiss the current verse and put the system in standby — useful at the end of a scripture reading when you don't want the next sentence to trigger a new verse. Say any verse reference to wake the system back up automatically.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "'Thank you' — dismisses current verse, enters standby",
                    "'Amen' — dismisses current verse, enters standby",
                    'Any verse reference — wakes from standby and displays verse',
                    'Esc key — immediately clears the screen',
                  ],
                },
              ],
            },
            {
              id: 'switching-translations-mid-sermon',
              title: 'Switching Translations Mid-Sermon',
              body: "Your pastor can switch Bible translations mid-sermon with a voice command. Say 'change to NIV', 'switch to ESV', or 'use the Amplified' and Q-worship re-displays the current verse in the new translation instantly. The translation switch persists for the rest of the session — subsequent verse detections will use the new translation until changed again.",
            },
          ],
        },
        {
          id: 'troubleshooting-and-tips',
          label: 'Troubleshooting & Tips',
          description:
            "Most Hands-Free Bible issues come down to audio quality. Here's how to diagnose and fix the most common problems.",
          steps: [
            {
              id: 'verses-not-appearing',
              title: 'Verses Not Appearing',
              body: "If verses aren't appearing when your pastor speaks, work through this checklist in order: (1) Is the waveform visualizer showing signal? If not, the microphone isn't sending audio. (2) Is the correct microphone selected in Audio Settings? (3) Is the microphone close enough to the speaker's mouth? (4) Is there excessive background noise (music, HVAC, crowd)? (5) Is the pastor speaking clearly and at a normal volume — not whispering or rushing?",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Waveform visualizer shows signal when speaking',
                    'Correct microphone selected in Audio Settings',
                    "Microphone within 30cm of speaker's mouth",
                    'No competing audio sources (music, crowd noise)',
                    'Speaker using clear, deliberate speech for references',
                  ],
                },
                {
                  type: 'tip',
                  body: "The most reliable test: have your pastor say 'John 3:16' clearly into the mic while watching the voice transcription display. If the text appears in the transcription but the verse doesn't project, the issue is with confidence threshold settings, not audio. If the text doesn't appear at all, the issue is audio.",
                },
              ],
            },
            {
              id: 'wrong-verse-appearing',
              title: 'Wrong Verse Appearing',
              body: "If Q-worship is displaying the wrong verse, the confidence threshold may be set too low — causing the system to match partial or ambiguous speech to a verse reference. Go to Settings > Voice Detection and raise the confidence threshold slightly (try 0.75 if it's currently at 0.65). You can also manually dismiss any wrong verse by pressing Esc or clicking the verse card.",
              blocks: [
                {
                  type: 'warning',
                  body: 'Setting the confidence threshold too high will cause the system to miss genuine references. The sweet spot for most environments is 0.65-0.80. Start at 0.70 and adjust based on your first Sunday experience.',
                },
              ],
            },
            {
              id: 'optimising-for-environment',
              title: 'Optimising for Your Environment',
              body: 'Every church environment is different. Here are the most impactful optimisations for common scenarios:',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Large sanctuary with reverb: use a close-mic lapel, not a room mic',
                    'Outdoor or open-air service: use a directional (cardioid) microphone',
                    "Multiple speakers: Q-worship can switch mic inputs between speakers — assign each speaker's mic in Audio Settings and switch before they begin",
                    'Noisy environment (band playing): activate Hands-Free mode only during the sermon, not worship',
                    'Quiet chapel: any microphone works well — even a USB desk mic',
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'first-sunday-checklist',
    categoryId: 'general',
    title: 'Selecting Your Video Output',
    description:
      'Connect to a projector via HDMI or broadcast wirelessly to OBS, vMix, ProPresenter, and Wirecast using NDI. Includes the Qworship Bridge download.',
    heroBody:
      'Connect Q-worship to your projector via HDMI, or broadcast wirelessly to OBS, ProPresenter, vMix, and more using NDI. This guide covers every output method for both the desktop app and Q-worship Cloud.',
    image: '/Photos/Guides/SYVO.webp',
    imageAlt: 'Q-worship stage view and display output settings',
    article: {
      title: {
        line1: 'Every screen.',
        line2Before: 'Wired or wireless,',
        accent: 'always in sync.',
      },
      body: "Whether you're running a single HDMI cable to a sanctuary projector or broadcasting wirelessly to OBS, ProPresenter, or vMix over NDI, Q-worship sends the same clean output every time — Bible verses, song lyrics, media, and announcements, with the control interface staying on the operator's screen only.",
    },
    steps: {
      summary: 'A step-by-step walkthrough for connecting Q-worship to your projector or broadcast software.',
      sections: [
        {
          id: 'wired-hdmi-setup',
          label: 'Wired HDMI Setup',
          description:
            'HDMI is the simplest and most reliable way to connect Q-worship to a projector or screen. If your operator machine is near the projector or connected via a long HDMI cable or HDBaseT extender, start here.',
          steps: [
            {
              id: 'connect-projector-or-screen',
              title: 'Connect Your Projector or Screen',
              body: "Connect the projector or TV to your operator machine using an HDMI cable. If the projector is far from the operator's position, use an HDMI over Cat5/Cat6 extender (HDBaseT) or a long active HDMI cable. Once connected, your operating system should detect the second display automatically.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'HDMI cable (up to 5m reliably without a booster)',
                    'Active HDMI cable (up to 15m)',
                    'HDMI over Cat5/Cat6 extender (HDBaseT) — up to 100m',
                    'USB-C to HDMI adapter (for newer MacBooks and laptops)',
                    'Thunderbolt to HDMI adapter (for Apple Silicon Macs)',
                  ],
                },
                {
                  type: 'tip',
                  body: 'If your operator machine only has one HDMI port and you need both a monitor and a projector, use a USB-C or Thunderbolt dock with multiple HDMI outputs, or a USB-C to dual HDMI adapter.',
                },
              ],
            },
            {
              id: 'extended-display-mode',
              title: 'Set Your OS to Extended Display Mode',
              body: "On Windows: right-click the desktop > Display Settings > select 'Extend these displays'. On macOS: System Preferences > Displays > Arrangement > uncheck 'Mirror Displays'. Extended mode means the projector shows a separate screen from the operator's monitor — the operator sees the Q-worship control panel, the congregation sees the projection output.",
              blocks: [
                {
                  type: 'warning',
                  body: "Do NOT use 'Mirror' or 'Duplicate' display mode. In mirror mode, the congregation would see the Q-worship control interface, not the clean projection output. Always use Extended mode.",
                },
              ],
            },
            {
              id: 'select-output-screen',
              title: 'Select the Output Screen in Q-worship',
              body: "In Q-worship, go to Settings > Display Output. You'll see a list of connected displays. Select the display that corresponds to your projector. Q-worship will send all projected content — Bible verses, song lyrics, media, announcements — to that display only. The operator's screen continues to show the control interface.",
              blocks: [
                {
                  type: 'tip',
                  body: "If you're not sure which display number corresponds to the projector, use the 'Identify' button in your OS display settings — it will show a large number on each screen so you can match them.",
                },
              ],
            },
            {
              id: 'test-with-test-slide',
              title: 'Test with a Test Slide',
              body: "Before the service, send a test slide to the projector to confirm everything is working. In Q-worship, open any Bible verse or song and click 'GO LIVE'. The content should appear on the projector. Check that the aspect ratio is correct (16:9 for most modern projectors), the text is fully visible, and the background is displaying correctly.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "Content appears on projector, not on operator's screen",
                    'Aspect ratio is correct (no stretching or black bars)',
                    'Text is fully readable from the back of the room',
                    'Background image or colour is displaying correctly',
                    'No cursor or taskbar visible on the projection screen',
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'ndi-wireless-setup',
          label: 'NDI Wireless Setup',
          description:
            'NDI (Network Device Interface) lets you send Q-worship\'s output wirelessly to OBS Studio, ProPresenter, vMix, Wirecast, and other platforms on the same network — no HDMI cable required. Q-worship Cloud users must install the Qworship Bridge app to enable NDI output.',
          steps: [
            {
              id: 'install-ndi-tools',
              title: 'Install NDI Tools',
              body: 'Download and install NDI Tools from ndi.video/tools/ndi-tools (free). This installs the NDI runtime on your computer, which Q-worship uses to broadcast its output over the local network. Install NDI Tools on both the Q-worship operator machine and the machine running OBS, vMix, or ProPresenter.',
              blocks: [
                {
                  type: 'tip',
                  body: 'NDI requires all devices to be on the same local network (same Wi-Fi network or wired LAN). NDI does not work over the internet or across different network segments.',
                },
              ],
            },
            {
              id: 'install-qworship-bridge',
              title: 'For Q-worship Cloud: Install Qworship Bridge',
              body: "If you're using Q-worship Cloud (the browser-based platform), you need to install the Qworship Bridge app on your operator machine to enable NDI output. The Bridge app acts as a local relay between the Q-worship Cloud browser session and the NDI network.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Download Qworship Bridge: https://qworship.com/download/bridge',
                    'Install and launch the Bridge app',
                    'Sign in with your Q-worship account',
                    'The Bridge app will automatically detect your active Q-worship Cloud session',
                    "NDI output will appear on the network as 'Qworship Bridge'",
                  ],
                },
                {
                  type: 'tip',
                  body: 'Q-worship Live Console (the desktop app) has NDI built in — no Bridge app needed. The Bridge app is only required for Q-worship Cloud users.',
                },
              ],
            },
            {
              id: 'enable-ndi-output',
              title: 'Enable NDI Output in Q-worship',
              body: "In Q-worship (or the Bridge app), go to Settings > Output > NDI and toggle NDI Output on. Give the NDI source a name (e.g. 'Qworship Main Output'). This name will appear in OBS, vMix, and other NDI-compatible software on the same network.",
            },
            {
              id: 'add-ndi-source',
              title: 'Add the NDI Source in OBS / vMix / ProPresenter',
              body: "In OBS Studio: Add a new Source > NDI Source > select 'Qworship Main Output' from the dropdown. In vMix: Add Input > NDI > select the Qworship source. In ProPresenter: Preferences > NDI > add the Qworship source. The Q-worship output will now appear as a live video feed in your streaming or presentation software.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'OBS Studio: Sources > + > NDI Source > select Qworship',
                    'vMix: Add Input > NDI > select Qworship',
                    'ProPresenter: Preferences > NDI > add source',
                    'Wirecast: Add Source > Network > NDI > select Qworship',
                    'Resolume: Sources > NDI > select Qworship',
                  ],
                },
              ],
            },
            {
              id: 'test-ndi-feed',
              title: 'Test the NDI Feed',
              body: 'In Q-worship, send a test slide to the NDI output. In OBS or vMix, you should see the Q-worship content appear in the NDI source preview. Verify that the content updates in real time as you navigate slides in Q-worship — there should be less than 100ms of latency on a wired network, and under 200ms on Wi-Fi.',
              blocks: [
                {
                  type: 'warning',
                  body: 'NDI over Wi-Fi can be unreliable in environments with many wireless devices (large churches, conference centres). For mission-critical streaming, use a wired Ethernet connection between the Q-worship machine and the streaming machine.',
                },
              ],
            },
          ],
        },
        {
          id: 'obs-websocket-integration',
          label: 'OBS WebSocket Integration',
          description:
            "Q-worship's OBS WebSocket integration goes beyond NDI — it gives Q-worship bidirectional control over OBS, so you can start/stop streaming, switch scenes, and sync content directly from the Q-worship interface.",
          steps: [
            {
              id: 'enable-obs-websocket-server',
              title: 'Enable OBS WebSocket Server',
              body: "In OBS Studio, go to Tools > WebSocket Server Settings. Enable the WebSocket server, set a port (default: 4455), and optionally set a password. Note down the port and password — you'll need them in Q-worship.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'OBS Studio 28+ required (WebSocket 5.x is built in)',
                    'Tools > WebSocket Server Settings > Enable WebSocket server',
                    'Default port: 4455',
                    'Set a password (recommended for security)',
                    'Click Apply and OK',
                  ],
                },
              ],
            },
            {
              id: 'connect-qworship-to-obs',
              title: 'Connect Q-worship to OBS',
              body: "In Q-worship, go to Settings > Integrations > OBS Studio. Enter the WebSocket server address (usually 'localhost' or the OBS machine's IP address if on a different machine), the port (4455), and the password. Click 'Connect'. The connection status indicator will turn green when connected successfully.",
              blocks: [
                {
                  type: 'tip',
                  body: "If OBS is running on the same machine as Q-worship, use 'localhost' as the address. If OBS is on a different machine on the same network, use that machine's local IP address (e.g. 192.168.1.50).",
                },
              ],
            },
            {
              id: 'map-service-items-obs-scenes',
              title: 'Map Service Items to OBS Scenes',
              body: 'Once connected, you can map Q-worship service items (songs, Bible readings, announcements) to OBS scenes. When you navigate to a service item in Q-worship, OBS automatically switches to the corresponding scene. This means your camera angles, overlays, and graphics in OBS are always in sync with what\'s happening in the service — with no manual OBS switching required.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Remote start/stop streaming from Q-worship',
                    'Remote start/stop recording from Q-worship',
                    'Automatic scene switching when navigating service items',
                    'Real-time content synchronisation between Q-worship and OBS',
                    'Connection status monitoring in Q-worship dashboard',
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'songbook-live',
    categoryId: 'general',
    title: 'Building Your Songbook',
    description:
      'Import songs from Word, PDF, or plain text. Organise sections, add CCLI metadata, and project lyrics live with the Sing-Along Pace feature to keep timing in sync with your worship leader.',
    heroBody:
      'Import songs from any format, organise them into sections, and project lyrics live with the Sing-Along Pace Setter. Your worship team will never lose their place in a song again.',
    image: '/Photos/Guides/BYS.webp',
    imageAlt: 'Q-worship songbook lyrics and song search interface',
    article: {
      title: {
        line1: 'Every lyric. Every section.',
        line2Before: '',
        accent: 'Always one click ahead.',
      },
      body: "During live worship, timing is everything. Q-worship's Songbook lets your operator jump between verses, choruses, and bridges with a single click while the congregation sees perfectly formatted lyrics on the big screen. Real-time sync between the control window and projection output means the band, the operator, and the congregation are always on the same bar.",
    },
    steps: {
      summary: 'A step-by-step walkthrough for building and running your Songbook.',
      sections: [
        {
          id: 'building-your-library',
          label: 'Building Your Library',
          description:
            "Your song library is the foundation of every worship service. Build it once, and it's ready for every Sunday — searchable, organised, and always up to date.",
          steps: [
            {
              id: 'import-songs-existing-files',
              title: 'Import Songs from Existing Files',
              body: 'If your church already has songs in Word documents, PDFs, or plain text files, you can import them directly into Q-worship. Go to Songbook > Import Song and select your file. Q-worship automatically parses the content and structures it into sections — Verse 1, Verse 2, Chorus, Bridge, etc. — based on the formatting in the file.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Microsoft Word (.docx) — best format for auto-parsing',
                    'PDF — text-based PDFs work; scanned image PDFs do not',
                    'Plain text (.txt) — use blank lines between sections',
                    "Formatting tip: label each section clearly (e.g. 'Verse 1:', 'Chorus:', 'Bridge:')",
                  ],
                },
                {
                  type: 'tip',
                  body: 'After importing, always review the parsed sections in the editor to confirm they were split correctly. Auto-parsing is accurate for well-formatted files but may need minor adjustments for unusual layouts.',
                },
              ],
            },
            {
              id: 'create-songs-wysiwyg-editor',
              title: 'Create Songs from Scratch in the WYSIWYG Editor',
              body: "For new songs or songs you're typing in manually, use the built-in WYSIWYG song editor. Go to Songbook > New Song. Type the song title, then add sections using the section type buttons. Each section has a type (Verse, Chorus, Bridge, Pre-Chorus, Tag, Intro, Outro) and a number. Type the lyrics directly into each section block.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Verse 1, 2, 3 — main lyric verses',
                    'Chorus — repeated refrain',
                    'Bridge — contrasting section',
                    'Pre-Chorus — lead-in to the chorus',
                    'Tag — repeated short phrase at the end',
                    'Intro — opening instrumental or lyric section',
                    'Outro — closing section',
                  ],
                },
                {
                  type: 'tip',
                  body: 'Use the undo/redo buttons (Ctrl+Z / Ctrl+Y) freely while editing. Q-worship maintains a full edit history for each song so you can always revert a mistake.',
                },
              ],
            },
            {
              id: 'add-metadata-ccli-key-tempo',
              title: 'Add Metadata: CCLI, Key, Tempo, Authors',
              body: "For each song, add the metadata your worship team needs. CCLI song number and your church's CCLI licence number are required for legal compliance if you're projecting copyrighted songs. Key and tempo help your musicians prepare. Authors and topics help you organise and search your library.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'CCLI Song Number — find at songselect.ccli.com',
                    "Your church's CCLI Licence Number — from your CCLI account",
                    'Key — e.g. G, A, Bb, C#m',
                    "Tempo — BPM or descriptor (e.g. 'Slow', 'Medium', 'Upbeat')",
                    'Authors — songwriter credits',
                    "Topics — e.g. 'Worship', 'Communion', 'Christmas', 'Healing'",
                    'Tags — custom labels for quick filtering',
                  ],
                },
              ],
            },
            {
              id: 'organise-with-tags-topics',
              title: 'Organise with Tags and Topics',
              body: 'Use tags and topics to organise your library so you can find the right song quickly during service planning. Create topics for seasons (Christmas, Easter, Pentecost), themes (Praise, Worship, Communion, Offering, Closing), and moods (Upbeat, Reflective, Celebratory). During service planning, filter by topic to quickly find songs that fit the theme of the service.',
              blocks: [
                {
                  type: 'tip',
                  body: 'A well-tagged library of 50 songs is more useful than an untagged library of 500. Spend 5 minutes tagging each song when you add it — it saves hours during service planning.',
                },
              ],
            },
          ],
        },
        {
          id: 'preparing-for-live-service',
          label: 'Preparing for a Live Service',
          description:
            'Before the service, load your songs into the service order and confirm that every section is correct. This takes about 10 minutes and prevents any surprises during worship.',
          steps: [
            {
              id: 'add-songs-to-service-order',
              title: 'Add Songs to the Service Order',
              body: "In the Presentations panel, open your service order and add songs from your library. Click 'Add Item' > 'Song' and search for the song by title, author, or tag. Songs are added as service items with all their sections automatically loaded. You can add the same song multiple times (e.g. if you're repeating it at the end of the service).",
            },
            {
              id: 'arrange-section-order',
              title: 'Arrange Section Order for Each Song',
              body: "For each song in the service order, you can customise the section order for this specific service. Click the song item to expand it and see all sections. Drag sections to reorder them — for example, if you're doing Verse 1 > Chorus > Verse 2 > Chorus > Bridge > Chorus, arrange them in that order. This arrangement is saved for this service only and doesn't affect the master song in your library.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Talk to your worship leader before the service to confirm the exact section arrangement for each song. Worship leaders often vary the arrangement week to week based on the flow of the service.',
                },
              ],
            },
            {
              id: 'set-backgrounds-for-song',
              title: 'Set Backgrounds for Each Song',
              body: 'For each song, you can assign a background image or video from your Media Library. Click the song item > Background > choose from Cloud Media Library (platform-provided worship backgrounds) or My Media Library (your uploaded assets). The background will appear behind the lyrics when the song is projected.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Choose a background that contrasts well with white text',
                    'Dark or blurred backgrounds work best for readability',
                    'Motion video backgrounds add visual energy for upbeat songs',
                    'Still image backgrounds are better for reflective or communion songs',
                    'Avoid busy or high-contrast backgrounds that compete with the text',
                  ],
                },
              ],
            },
            {
              id: 'enable-sing-along-pace-setter',
              title: 'Enable the Sing-Along Pace Setter',
              body: "The Sing-Along Pace Setter highlights the current line of lyrics in real time as the congregation sings, helping everyone stay in sync. To enable it, open the song item in the service order and toggle 'Sing-Along Mode' on. During the service, the operator advances the highlighted line using the arrow keys or the on-screen navigation buttons.",
              blocks: [
                {
                  type: 'tip',
                  body: 'The Sing-Along Pace Setter is especially effective for new songs the congregation is learning, or for songs with complex rhythms where people tend to fall behind or rush ahead. For familiar songs, you may prefer standard section-based navigation.',
                },
              ],
            },
          ],
        },
        {
          id: 'using-the-songbook-live',
          label: 'Using the Songbook Live',
          description:
            'During the service, the Songbook is designed for one-click navigation. Your operator stays focused on the service, not the software.',
          steps: [
            {
              id: 'navigate-sections-one-click',
              title: 'Navigate Sections with One Click',
              body: "During a live service, the section navigation panel shows all sections for the current song as large, clearly labelled buttons (Verse 1, Chorus, Bridge, etc.). Click any section button to instantly project that section on screen. The projection window updates in real time — there is no delay between clicking and the lyrics appearing on the congregation's screen.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Position the section navigation panel where your operator can see it at a glance without searching. The large button labels are designed to be readable even under stage lighting or in a dim room.',
                },
              ],
            },
            {
              id: 'use-sing-along-pace-setter-live',
              title: 'Use the Sing-Along Pace Setter Live',
              body: "If Sing-Along Mode is enabled, use the right arrow key or the 'Next Line' button to advance the highlighted line as the congregation sings. The current line is highlighted in the accent colour; the next line is slightly dimmed. This gives the congregation a visual cue about where the song is going, reducing the hesitation that happens when people aren't sure of the next line.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Right arrow key — advance to next line',
                    'Left arrow key — go back one line',
                    'Down arrow key — jump to next section',
                    'Up arrow key — go back to previous section',
                    'Space bar — toggle between current and next section preview',
                  ],
                },
              ],
            },
            {
              id: 'switch-songs-during-service',
              title: 'Switch Songs During Service',
              body: "If the worship leader changes the song order mid-service (it happens!), you can switch to any song in the service order instantly. Click the song in the service items panel on the left side of the Q-worship interface. The projection screen updates immediately. If the new song isn't in the service order, use the quick-search bar to find it in your library and add it on the fly.",
              blocks: [
                {
                  type: 'warning',
                  body: 'If you add a song on the fly during a live service, it will be added to the current service order but will not have a background assigned. The song will project with the default background. Assign a background before projecting if possible.',
                },
              ],
            },
            {
              id: 'realtime-sync-control-display',
              title: 'Real-Time Sync Between Control and Display Windows',
              body: "Q-worship uses cross-window synchronisation to keep the control window and the projection display window perfectly in sync. Every section change, background change, and text update in the control window is reflected on the projection screen within milliseconds. If you're running Q-worship on a single machine with two displays, both windows stay in sync automatically — no manual refresh needed.",
            },
          ],
        },
      ],
    },
  },
  {
    id: 'service-slides-order',
    categoryId: 'general',
    title: 'Understanding the Lower Third Builder',
    description:
      "Design broadcast-quality lower thirds for scripture references, speaker names, song credits, and social handles — fully customizable to match your church's brand.",
    heroBody:
      'Design broadcast-quality lower thirds for scripture references, speaker names, song titles, and announcements — directly inside Q-worship. No After Effects, no external software, no extra operator.',
    image: '/Photos/Guides/ULTB.webp',
    imageAlt: 'Pastor preaching with a lower third scripture overlay',
    article: {
      title: {
        line1: 'Every reference.',
        line2Before: 'Broadcast-ready,',
        accent: 'built right in.',
      },
      body: "Lower thirds shouldn't require a second app or a video editor. Q-worship's built-in Lower Third Builder lets you create, template, and display scripture references, speaker names, song titles, and announcements as a clean overlay — on your projection, your OBS output, and your NDI feed, all at once.",
    },
    steps: {
      summary: 'A step-by-step walkthrough for building and running lower thirds in Q-worship.',
      sections: [
        {
          id: 'what-are-lower-thirds',
          label: 'What Are Lower Thirds?',
          description:
            "Lower thirds are broadcast graphics that appear in the lower portion of the screen — displaying scripture references, speaker names, song titles, or announcements. Q-worship's built-in Lower Third Builder lets you create, customise, and display them without any external design software.",
          steps: [
            {
              id: 'what-lower-thirds-used-for',
              title: 'What Lower Thirds Are Used For',
              body: 'In a church service, lower thirds serve several practical purposes: they reinforce the scripture reference being preached, identify the speaker on screen for online viewers, display song titles and CCLI numbers for compliance, and show announcements or event details. In Q-worship, lower thirds are separate from the main projection — they appear as an overlay on top of your existing slide content.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "Scripture reference (e.g. 'John 3:16 · NIV') during a sermon",
                    "Speaker name and title (e.g. 'Pastor James Osei · Senior Pastor')",
                    'Song title and CCLI number during worship',
                    "Announcement text (e.g. 'Youth Group · Friday 7pm')",
                    'Event branding or series title',
                    'Translation label for multilingual services',
                  ],
                },
              ],
            },
            {
              id: 'how-lower-thirds-work',
              title: 'How Lower Thirds Work in Q-worship',
              body: "Q-worship's Lower Third Builder has two parts: the Template Gallery (where you choose and customise a template) and the Canvas Editor (where you fine-tune individual elements). Once a lower third is active, it appears as an overlay on your projection screen and your OBS/NDI output simultaneously. You can toggle lower thirds on and off during a live service with a single click using the ACTIVE toggle in the top right of the Lower Third Settings panel.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Lower thirds are non-destructive — they appear on top of your existing slide content without replacing it. You can show a scripture lower third while a worship background is displayed, or a speaker name while a video is playing.',
                },
              ],
            },
            {
              id: 'streaming-source-url',
              title: 'The Streaming Source URL',
              body: 'Q-worship generates a unique Streaming Source URL for your lower thirds. This URL can be added as a browser source in OBS Studio, giving you a clean, transparent lower third overlay directly in your stream without needing NDI. Copy the URL from the Lower Third Settings panel and paste it into OBS as a Browser Source with a transparent background.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Copy the Streaming Source URL from Lower Third Settings',
                    'In OBS: Add Source > Browser Source',
                    'Paste the URL into the URL field',
                    'Set width to 1920 and height to 1080',
                    "Check 'Shutdown source when not visible'",
                    'The lower third will appear as a transparent overlay in OBS',
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'choosing-a-template',
          label: 'Choosing a Template',
          description:
            'Q-worship includes a library of professionally designed lower third templates across 5 categories: Professional, Contemporary, Elegant, Branded, and Custom. Each template is available for Bible scripture, song lyrics, and announcements.',
          steps: [
            {
              id: 'navigate-template-gallery',
              title: 'Navigate the Template Gallery',
              body: 'Open Lower Third Settings from the Q-worship control panel. The Template Gallery shows all available templates as visual cards — you can see exactly what each template looks like with real scripture content before selecting it. Use the category filter pills (All Templates, Professional, Contemporary, Elegant, Branded, Custom) to narrow down the options.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Glass Scripture — premium glassmorphism overlay with logo area, reference badge, and translation label',
                    'Classic Solid — timeless solid-bar design with verse text, scripture reference, and translation label',
                    'Clean Gradient — sophisticated gradient background with verse, reference, and translation label',
                    'Cosmic Fire — cinematic space nebula background with a bold maroon reference banner',
                    'Crystal Dark — dark violet-navy gradient overlay with a centred reference caption',
                    'Ember Glow — warm crimson-to-amber gradient with a pill reference badge and bold verse text',
                    'Ivory Clean — minimalist high-contrast design with a white left accent',
                  ],
                },
              ],
            },
            {
              id: 'separate-templates-per-content-type',
              title: 'Set Separate Templates for Scripture, Lyrics, and Announcements',
              body: "Q-worship lets you set different templates for different content types. Use the 'Scripture Template' dropdown for Bible verse lower thirds, the 'Lyrics Template' dropdown for song lyric lower thirds, and the Announcements tab for announcement lower thirds. This means your scripture lower thirds can have a different style from your song lyric lower thirds — keeping each content type visually distinct.",
              blocks: [
                {
                  type: 'tip',
                  body: 'A common approach: use a clean, minimal template for scripture (so the verse text is the focus), a more energetic or branded template for song lyrics, and a simple announcement template for event details. This visual variety helps the congregation instantly recognise what type of content is being shown.',
                },
              ],
            },
            {
              id: 'preview-before-going-live',
              title: 'Preview Before Going Live',
              body: "Click 'Preview Active' in the top right of the Template Gallery to see exactly how the active lower third will look on screen. The preview shows the template with real content — the actual scripture reference, verse text, and translation label from the currently active slide in Q-worship. Use this to confirm the template looks correct before the service starts.",
              blocks: [
                {
                  type: 'warning',
                  body: "Always preview your lower thirds before the service, especially if you've changed templates recently. A template that looks great in the gallery may not work well with a particular background image — check the contrast and readability in the preview.",
                },
              ],
            },
            {
              id: 'duplicate-customise-templates',
              title: 'Duplicate and Customise Templates',
              body: "Any template can be duplicated and customised. Right-click a template card > Duplicate. The duplicate appears in the 'Custom' category. Open the Canvas Editor to modify the duplicate — change colours, fonts, sizes, and positions to match your church's brand. Your custom templates are saved to your account and available in every service.",
            },
          ],
        },
        {
          id: 'using-the-canvas-editor',
          label: 'Using the Canvas Editor',
          description:
            'The Canvas Editor lets you customise every element of a lower third template — text content, colours, fonts, sizes, positions, and background shapes. Changes are reflected in the live preview in real time.',
          steps: [
            {
              id: 'canvas-editor-layout',
              title: 'Understanding the Canvas Editor Layout',
              body: 'The Canvas Editor has three panels: the Elements panel on the left (listing all elements in the template), the live preview canvas in the centre (showing the template at full 16:9 resolution), and the Properties panel on the right (showing the editable properties of the selected element). Click any element in the Elements panel or directly on the canvas to select it and see its properties.',
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    "Reference — the scripture reference text element (e.g. 'John 3:16')",
                    'Verse Text — the main verse content text element',
                    "Translation — the Bible translation label (e.g. 'NIV', 'KJV')",
                    'Reference Badge — the background shape behind the reference text',
                    'Background Shape — the main lower third background element',
                  ],
                },
              ],
            },
            {
              id: 'editing-text-elements',
              title: 'Editing Text Elements',
              body: "Select any text element (Reference, Verse Text, Translation) in the Elements panel. In the Properties panel, you can change the font family, font size, font weight, text colour, text alignment, and position. For the Reference and Translation elements, the content is automatically populated from the active slide in Q-worship — you don't need to type it manually. For custom text elements you add yourself, type the content directly in the Properties panel.",
              blocks: [
                {
                  type: 'tip',
                  body: 'Use the font size carefully — the Verse Text element needs to be large enough to read from the back of the room, but small enough to fit within the lower third area without overlapping the main slide content. A font size between 28px and 42px works well for most templates.',
                },
              ],
            },
            {
              id: 'adding-editing-shapes',
              title: 'Adding and Editing Shapes',
              body: "Click '+ Shape' in the canvas toolbar to add a new shape element. Shapes can be rectangles, rounded rectangles, or ellipses. Use shapes to create background panels, accent bars, or decorative elements. In the Properties panel, set the fill colour, opacity, border radius, border colour, and border width. Shapes can be layered behind or in front of text elements using the layer order controls in the Elements panel.",
            },
            {
              id: 'adding-images-logos',
              title: 'Adding Images and Logos',
              body: "Click '+ Image' in the canvas toolbar to add an image element. Upload your church logo or any image from your Media Library. Position it anywhere on the canvas. Images can be resized, repositioned, and have their opacity adjusted. Adding your church logo to the lower third template creates a branded look that reinforces your church's identity on screen and in the stream.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'Use a PNG with transparent background for logos',
                    'Position the logo in the top-left or bottom-right corner',
                    'Keep the logo small — it should accent the lower third, not dominate it',
                    'Use a white or light-coloured logo version for dark backgrounds',
                    'Use a dark logo version for light or gradient backgrounds',
                  ],
                },
              ],
            },
            {
              id: 'save-custom-template',
              title: 'Save Your Custom Template',
              body: "Click 'Save' in the top right of the Canvas Editor to save your changes. Give the template a name that describes its use (e.g. 'Sunday Sermon Scripture', 'Worship Lyrics Branded', 'Announcement Clean'). Saved templates appear in the Custom category of the Template Gallery and are available in every service.",
            },
          ],
        },
        {
          id: 'using-lower-thirds-live',
          label: 'Using Lower Thirds Live',
          description:
            "During a live service, lower thirds are controlled with a single toggle. Q-worship automatically populates the lower third content from the active slide — you don't need to type anything during the service.",
          steps: [
            {
              id: 'enable-lower-thirds-before-service',
              title: 'Enable Lower Thirds Before the Service',
              body: 'Open Lower Third Settings and confirm the correct template is selected for each content type (Scripture, Lyrics, Announcements). Toggle the ACTIVE switch in the top right to ON. The lower third is now armed — it will appear on screen whenever you navigate to a slide that has lower third content associated with it.',
              blocks: [
                {
                  type: 'tip',
                  body: 'Enable lower thirds during your pre-service sound check, not at the start of the service. This gives you time to confirm the template looks correct on the actual projection screen and OBS output before the congregation arrives.',
                },
              ],
            },
            {
              id: 'automatic-content-population',
              title: 'Automatic Content Population',
              body: "When you navigate to a Bible verse slide in Q-worship, the Scripture lower third automatically populates with the reference (e.g. 'John 3:16'), the verse text, and the translation label (e.g. 'NIV'). When you navigate to a song section, the Lyrics lower third populates with the song title and section name. You don't need to type anything — Q-worship reads the active slide content and populates the lower third automatically.",
            },
            {
              id: 'toggle-lower-thirds-on-off',
              title: 'Toggle Lower Thirds On and Off',
              body: "Use the ACTIVE toggle in the Lower Third Settings panel to show or hide the lower third at any time during the service. The toggle is large and clearly visible so you can operate it quickly without searching for it. A common workflow: show the scripture lower third when the pastor reads a verse, hide it while they're preaching, show it again for the next verse.",
              blocks: [
                {
                  type: 'checklist',
                  items: [
                    'ACTIVE toggle ON — lower third is visible on screen and in stream',
                    'ACTIVE toggle OFF — lower third is hidden (main slide content only)',
                    'Toggle responds immediately — no delay between click and screen update',
                    'The toggle state is visible in the Q-worship control panel at all times',
                  ],
                },
              ],
            },
            {
              id: 'lower-thirds-obs-streaming-url',
              title: 'Lower Thirds in OBS via Streaming Source URL',
              body: "If you're using OBS for streaming, add the Streaming Source URL as a Browser Source in OBS. The lower third will appear as a transparent overlay in your OBS scene, perfectly synced with Q-worship. When you toggle the lower third in Q-worship, it appears and disappears in OBS simultaneously. No manual OBS switching required.",
              blocks: [
                {
                  type: 'tip',
                  body: "In OBS, place the Browser Source (lower third) at the top of your source stack so it appears above all other sources. Give it a clear name like 'Qworship Lower Third' so it's easy to identify in the OBS source list.",
                },
              ],
            },
          ],
        },
      ],
    },
  },
]

export const guidesHeroCopy = {
  badge: 'ARTICLES & GUIDES',
  heading: {
    accent: 'Everything',
    rest: 'your church needs',
  },
  body: featuresHeroCopy.body,
  primaryCta: 'Download',
  secondaryCta: 'Get Started online',
  image: '/Photos/Heros/Hero-guides.webp',
}

export const guidesCategoryItems: GuideCategoryItem[] = [
  { id: 'general', label: 'General' },
  { id: 'my-first-sunday', label: 'My first Sunday' },
  { id: 'hands-free-bible', label: 'Hands-Free Bible' },
  { id: 'my-songbook', label: 'My Songbook' },
  { id: 'service-slides', label: 'Service Slides' },
  { id: 'media', label: 'Media' },
  { id: 'lower-third', label: 'Lower third' },
]

export function getGuideById(id: string): GuideCard | undefined {
  return guideCards.find((guide) => guide.id === id)
}

export function getRelatedGuides(currentGuideId: string, categoryId: string, limit = 3): GuideCard[] {
  const sameCategory = guideCards.filter(
    (guide) => guide.categoryId === categoryId && guide.id !== currentGuideId,
  )
  const others = guideCards.filter(
    (guide) => guide.categoryId !== categoryId && guide.id !== currentGuideId,
  )

  return [...sameCategory, ...others].slice(0, limit)
}

export function getGuideArticleContent(guideId: string): GuideArticleContent {
  const guide = getGuideById(guideId)
  if (guide) {
    return guide.article
  }

  return {
    title: { line1: 'Guide not found' },
    body: '',
  }
}

const guideCardDescription =
  'Stay in the moment. Just say the reference out loud — Qworship hears you, finds the verse, and puts it on screen. No pausing, no searching, no breaking your stride at the pulpit.'

export const faqsHeroCopy = {
  badge: 'FAQS',
  heading: {
    line1: 'Your Questions',
    accent: 'Answered',
  },
  body: featuresHeroCopy.body,
  primaryCta: 'Download',
  secondaryCta: 'Get Started online',
  image: '/Photos/Heros/Hero-FAQ.webp',
}

export const faqCategoryItems: FaqCategoryItem[] = [
  { id: 'general', label: 'General' },
  { id: 'hands-free-bible', label: 'Hands-Free Bible' },
  { id: 'offline-and-online', label: 'Offline and Online' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'service-slides', label: 'Service Slides' },
  { id: 'my-media', label: 'My Media' },
  { id: 'lower-third', label: 'Lower Third' },
]

import { faqItems, pricingFaqTeaserItems } from '@/lib/faqPool'

export { faqItems, pricingFaqTeaserItems }

export const downloadsPageCopy: DownloadsPageCopy = {
  banner: {
    title: 'Get Started',
    image: downloadBannerImage,
    imageAlt: 'Pastor speaking on stage',
  },
  product: {
    title: 'Download',
    subtitle: 'Q-worship Live Console',
    version: 'Version 1.1.2 (35258370)',
    highlights: 'Accuracy Improvements, Offline',
    date: 'June 25, 2026',
    image: '/Photos/Heros/Download%20-%20image.webp',
    imageAlt: 'Operator running Q-worship during a live service',
  },
  platforms: [
    { id: 'windows', label: 'Windows', icon: 'windows' },
    { id: 'mac', label: 'Mac Os', icon: 'mac' },
  ],
  resourceLinks: [
    { id: 'feature-updates', label: 'Feature Updates', icon: 'featured_play_list' },
    { id: 'release-notes', label: 'Release Notes', icon: 'description' },
    { id: 'system-specifications', label: 'System Specifications', icon: 'layers' },
  ],
  resourceContent: {
    releaseVersions: [
      {
        id: 'v1-0-3',
        version: 'Version 1.0.3',
        tagline: 'Stability, Reliability & Voice Intelligence',
        releasedDate: '14 July 2026',
        platform: 'windows',
        featureUpdates: [
          {
            id: 'instant-translation-switching',
            title: 'Instant Bible Translation Switching via Voice',
            body: 'Pastors can now switch between all six Bible translations in real time using natural voice commands in both Offline and Online modes. Simply say "New International Version", "ESV", "NKJV", "Amplified", "The Message", or any recognised variant — the system immediately re-projects the current verse in the requested translation. Switching is now instant when the translation has already been loaded, and falls back to a direct database lookup in under one second when it has not. All six translations are supported: KJV, NKJV, NIV, ESV, AMP, and MSG. Supported voice commands for translation switching include:',
            table: {
              columnLabels: ['What you say', 'Translation'],
              rows: [
                ['"KJV" / "King James Version"', 'King James Version'],
                ['"NKJV" / "New King James Version" / "New King James"', 'New King James Version'],
                ['"NIV" / "New International Version" / "New International"', 'New International Version'],
                ['"ESV" / "English Standard Version" / "English Standard"', 'English Standard Version'],
                ['"AMP" / "Amplified" / "Amplified Bible"', 'Amplified Bible'],
                ['"MSG" / "The Message" / "Message Bible"', 'The Message'],
                ['"Switch to ESV" / "Let\'s see the NIV" / "Show me the Amplified"', 'Respective version'],
              ],
            },
          },
        ],
        releaseNotes: [
          'Fixes an issue where saying "NIV", "ESV", or "NKJV" by voice would not re-project the current verse in the requested translation in Offline mode.',
          'Fixes an issue where the translation fetch path could block for up to ten seconds when the system was simultaneously loading Bible data in the background, causing the voice version-switch command to silently time out.',
          'Fixes an issue where the auto-update notification would appear on every app launch even when the installed version was already the latest available release.',
          'Fixes an issue where the app version reported in Settings → About & Updates did not reflect the most recently deployed build.',
        ],
      },
      {
        id: 'v1-0-2',
        version: 'Version 1.0.2',
        tagline: 'Voice Recognition Intelligence & Accuracy',
        releasedDate: '13 July 2026',
        platform: 'windows',
        featureUpdates: [
          {
            id: 'partial-transcript-offline',
            title: 'Partial Transcript Recognition for Offline Mode',
            body: 'The Offline voice engine now scans speech as it is being spoken, projecting Bible references the moment the verse number is heard — without waiting for the pastor to pause. This mirrors the behaviour already present in Online mode and brings sub-one-second projection latency to Offline mode as well. A stability guard ensures the book name must be detected consistently across multiple consecutive scans before projecting, preventing false positives.',
          },
          {
            id: 'round-tens-disambiguation',
            title: 'Round-Tens Chapter and Verse Disambiguation',
            body: 'The system now correctly handles references where the chapter is a round multiple of ten (20, 30, 40, 50, 60, 70, 80, 90, 100) and the verse is a single digit. For example, "Genesis 20 verse 1" now projects Genesis 20:1 correctly, rather than being misread as Genesis 21:1. All affected references — including Psalm 50:1, Psalm 90:1, Isaiah 60:1, and others — are now resolved accurately.',
          },
          {
            id: 'explicit-verse-guard',
            title: 'Explicit Verse Guard — No Scripture is Better Than Wrong Scripture',
            body: 'The system will no longer auto-project a reference if the verse number was not explicitly spoken. If the pastor says "Song of Solomon chapter 3" without specifying a verse, the reference is placed in the Confidence Queue for manual confirmation rather than defaulting to verse 1. This prevents unintended projections during conversational speech.',
          },
          {
            id: 'out-of-range-chapter-routing',
            title: 'Out-of-Range Chapter Routing',
            body: 'When a pastor speaks a chapter number that does not exist for the stated book — for example, "Obadiah chapter 2" (Obadiah has only one chapter) — the system now routes the command to the Confidence Queue with a clear warning rather than silently remapping it to chapter 1. This gives the pastor full visibility and control over what is projected.',
          },
          {
            id: 'confidence-queue-click-reliability',
            title: 'Confidence Queue Click-to-Project Reliability',
            body: 'Clicking a verse card in the Confidence Queue now reliably projects the verse even if the background data fetch had not yet completed at the time of the click. A fallback lookup is performed on demand, ensuring no click is ever silently ignored.',
          },
          {
            id: 'mid-sermon-extraction',
            title: 'Robust Mid-Sermon Scripture Extraction',
            body: 'When a pastor speaks a scripture reference in the middle of a continuous sentence, the system now extracts a focused window around the reference and evaluates it independently of surrounding conversational words. This significantly improves accuracy for references embedded in longer utterances.',
          },
        ],
        releaseNotes: [
          'Fixes an issue where saying "Genesis 20 verse 1" would project Genesis 21:1 due to the speech engine collapsing "twenty" and "one" into the compound number twenty-one.',
          'Fixes an issue where saying "Psalm 90 verse 1" would project Psalm 91:1 for the same reason.',
          'Fixes an issue where saying "Isaiah 60 verse 1" would project Isaiah 61:1.',
          'Fixes an issue where saying "Obadiah chapter 2 verse 3" would silently project Obadiah 1:3 instead of showing an out-of-range warning.',
          'Fixes an issue where clicking a Confidence Queue card immediately after it appeared could result in nothing being projected.',
          'Fixes an issue where a reference spoken in the middle of a long sentence (more than seven words) would not be detected or projected.',
          'Fixes an issue where the system would auto-project verse 1 as a default when only a book and chapter were spoken, without a verse number being stated.',
          'Fixes an issue where the Offline mode badge in the Live Transcript panel would always show "WEB" regardless of whether the user was in Offline or Online mode.',
          'Fixes an issue where saying "let\'s see the next verse" in Offline mode would trigger a Bible translation switch to The Message instead of navigating to the next verse.',
          'Fixes an issue where three-word compact references such as "Romans 1 1", "Matthew 7 7", and "James 1 3" were silently dropped before reaching the verse resolver.',
          'Fixes an issue where saying "the message Philippians four nineteen" would project Colossians 2:2 instead of Philippians 4:19 due to the word "message" being misidentified as a book name.',
          'Fixes an issue where saying "malachi chapter set" (where the chapter number was misheard) would silently default to projecting Malachi 1:1 instead of dropping the ambiguous command.',
          'Fixes an issue where saying "Timothy chapter 2 verse 3" without the ordinal prefix would project Isaiah 2:1 instead of 1 Timothy 2:3.',
          'Fixes an issue where saying "Second Samuel chapter 3 verse 1" would project 1 Samuel 3:1 instead of 2 Samuel 3:1.',
          'Fixes an issue where saying "Colossians chapter 2 verse 1" in Offline mode would auto-project Galatians 2:1 due to phonetic similarity between the two book names. The system now presents both options in the Confidence Queue for the pastor to confirm.',
          'Fixes an issue where saying "Nahum chapter 1 verse 3" would project Colossians 1:3 when the word "colossians" appeared earlier in the transcript.',
          'Fixes an issue where saying "Can we see Nehemiah chapter 4 verse 4" would project Daniel 4:4 because the phrase "we see" was misheard as the word "verse".',
          'Fixes an issue where navigation noise words such as "previous" or "next" appearing in the chapter or verse number slot of a transcript would cause the chapter or verse to be dropped entirely.',
          'Fixes an issue where saying "First Corinthians chapter 3 verse 16" would not project because the speech engine output an unrecognised token in place of "first corinthians".',
          'Fixes an issue where saying "Galatians chapter 5 verse 22" or "Leviticus chapter 19 verse 18" would not project because the confidence score fell below the projection threshold.',
          'Fixes an issue where saying "Ephesians chapter 3 verse 8" would not project correctly because the word "eight" was misheard as the word "it".',
          'Fixes an issue where saying "Matthew chapter 7 verse 7" would not project because the speech engine collapsed "seven verse seven" into the compound number "seventy-seven".',
          'Fixes an issue where saying "Philemon chapter 4 verse 1" would be silently dropped instead of projecting Philemon 1:1 (Philemon has only one chapter).',
          'Fixes an issue where out-of-range Bible references such as "Matthew chapter 4 verse 26" (Matthew 4 has only 25 verses) would fail silently with no feedback. These now appear in the Confidence Queue with a red "OUT OF RANGE" indicator.',
          'Fixes an issue where saying "N K J V" (spelling out the acronym letter by letter) would resolve to KJV instead of NKJV.',
          'Fixes an issue where saying "A M P" or "M S G" letter by letter would not trigger a translation switch.',
          'Fixes an issue where long conversational transcripts containing a scripture reference near the end would fail to project because earlier words in the sentence interfered with the book name detection.',
          'Fixes an issue where saying "Habakkuk chapter 3 verse 4" would drop the chapter number when the word "three" appeared before a cue word and was incorrectly treated as a spurious preamble number.',
          'Fixes an issue where saying "Leviticus chapter two from the third verse" would auto-project instead of being placed in the Confidence Queue for confirmation.',
          'Fixes an issue where a reference containing an ordinal verse construction (such as "from the third verse") could be misidentified due to the ordinal being converted before the safety check ran.',
        ],
      },
      {
        id: 'v1-0-1',
        version: 'Version 1.0.1',
        tagline: 'Broadcast Integration, Bible Data & Voice Foundation',
        releasedDate: '1 July 2026',
        platform: 'windows',
        featureUpdates: [
          {
            id: 'ndi-broadcast-output',
            title: 'NDI Wireless Broadcast Output',
            body: 'Qworship Live Console now outputs directly to NDI-compatible broadcast software including OBS Studio, vMix, ProPresenter, and any NDI receiver on the local network. When NDI is selected in Display Settings and GO LIVE is pressed, the system creates two named NDI sources — "Qworship Audience" (the full presentation output) and "Qworship Lower Third" (for lower-third graphics) — which appear automatically in all NDI receivers on the same network. No additional configuration is required.',
          },
          {
            id: 'hands-free-offline-mode',
            title: 'Hands-Free Bible — Offline Mode',
            body: 'A fully offline voice recognition engine is now available for environments without internet access. The offline engine uses a dynamic language model specifically tuned for Bible vocabulary, with grammar constraints covering all 66 Bible books, chapter and verse numbers, navigation commands, and all six translation names. Recognition accuracy is maintained even for less commonly spoken books such as Habakkuk, Obadiah, Zephaniah, Nahum, Philemon, and Titus. Offline mode operates entirely on-device with no audio data sent to any server.',
          },
          {
            id: 'hands-free-online-mode',
            title: 'Hands-Free Bible — Online Mode',
            body: 'Online mode connects to the Qworship cloud transcription service for the highest possible recognition accuracy. The cloud engine is optimised for natural conversational speech, meaning pastors do not need to use specific phrasing — references like "Genesis chapter 4 verse 6" and "Genesis 4 6" are both recognised correctly. The Online engine also supports all navigation and translation-switch commands. Online mode requires an active internet connection and a valid Qworship subscription.',
          },
          {
            id: 'logos-predictive-recognition',
            title: 'Logos-Style Predictive Recognition (Online Mode)',
            body: 'Online mode now projects Bible references the moment the verse number is heard, without waiting for the pastor to finish speaking. Partial transcripts are scanned continuously and a reference is projected as soon as a complete book, chapter, and verse are detected. A guard prevents premature projection of verse 1 as a default when only a book and chapter have been spoken.',
          },
          {
            id: 'voice-navigation-commands',
            title: 'Voice Navigation Commands',
            body: 'All navigation commands are supported in both Offline and Online modes:',
            table: {
              columnLabels: ['Spoken Command', 'Action'],
              rows: [
                ['"Next Verse" / "Next"', 'Advances to the next verse'],
                ['"Previous Verse" / "Previous"', 'Returns to the previous verse'],
                ['"Verse 10" / "Take me to verse 10"', 'Jumps to a specific verse in the current chapter'],
                ['"Amen" / "Thank you"', 'Dismisses the Hands-Free Bible'],
              ],
            },
          },
          {
            id: 'voice-translation-switching-online',
            title: 'Voice Translation Switching (Online Mode)',
            body: 'All six Bible translations can be switched by voice in Online mode. The system recognises full names, abbreviations, and natural phrases such as "Switch to ESV", "Let\'s see the Amplified", and "Read in the Message". The current verse is immediately re-projected in the new translation after the command is recognised.',
          },
          {
            id: 'manual-scripture-search',
            title: 'Manual Scripture Search',
            body: 'A keyboard search bar is embedded directly in the Hands-Free Bible panel, providing a typed fallback for environments where voice commands are impractical. Typing a reference such as "Jn 3:16" or "Romans 8:1" and pressing Enter projects the verse live, populates the chapter panel, and updates the Detected Verses sidebar — identical to the voice command path.',
          },
          {
            id: 'all-six-translations-verified',
            title: 'All Six Bible Translations — Complete and Verified',
            body: 'All six Bible translations (KJV, NKJV, NIV, ESV, AMP, MSG) are fully populated with verified verse data covering all 31,406 verses across all 66 books. Earlier builds contained data integrity issues that left the Amplified Bible and The Message with empty verse records. These have been fully resolved.',
          },
          {
            id: 'on-screen-bible-instant-loading',
            title: 'On-Screen Bible — Instant Loading',
            body: 'The On-Screen Bible panel now loads verses instantly using a direct database connection. Earlier builds experienced a loading delay of ten seconds or more when opening the Bible panel. Verses now appear within one second for any book and chapter.',
          },
          {
            id: 'confidence-queue-visual-feedback',
            title: 'Confidence Queue — Visual Feedback for Voice Commands',
            body: 'When the system detects a Bible reference with moderate confidence, it places the reference in the Confidence Queue rather than projecting immediately. The pastor can review and confirm the reference with a single click. Out-of-range references (structurally valid but non-existent, such as Matthew 4:26) appear with a red "OUT OF RANGE" indicator and cannot be accidentally projected.',
          },
          {
            id: 'sermon-context-detection',
            title: 'Sermon-Context Reference Detection',
            body: 'The system recognises Bible references spoken in the middle of conversational sentences. Phrases such as "Can we go to Romans chapter 8 verse 28" and "Let\'s look at the book of John chapter 3 verse 16" are handled correctly, with common preamble phrases stripped before the reference is parsed.',
          },
          {
            id: 'enhanced-cloud-transcription',
            title: 'Enhanced Cloud Transcription — 113 Bible-Specific Vocabulary Terms (Online Mode)',
            body: 'The Online mode cloud service has been configured with 113 Bible-specific vocabulary terms, including all 66 book names, common mispronunciations, chapter and verse navigation phrases, and translation names. This significantly improves recognition accuracy for proper nouns that are rarely encountered in general speech.',
          },
        ],
        releaseNotes: [
          'Fixes an issue where the NDI native module would fail to load on Windows because a required system library was not found alongside the module file.',
          'Fixes an issue where the On-Screen Bible panel would display "Loading verses…" indefinitely when opened for the first time.',
          'Fixes an issue where the Amplified Bible and The Message showed empty verse text for all 31,406 verses.',
          'Fixes an issue where Bible lookups in the cloud service would take two to four seconds per verse due to the verse data not being loaded into memory during server startup.',
          'Fixes an issue where the cloud Bible service would return King James Version text regardless of which translation was selected.',
          'Fixes an issue where the cloud service would return HTML instead of verse data when called from the Qworship web application, causing the chapter grid to display "Loading…" indefinitely.',
          'Fixes an issue where saying "next verse" or "previous verse" in Online mode would not navigate correctly because the navigation handler did not receive the current verse context from the client.',
          'Fixes an issue where switching to a new Bible translation by voice in Online mode would project the verse in the old translation due to a race condition between the translation state update and the verse fetch.',
          'Fixes an issue where the Offline speech engine would not recognise the book of Malachi, outputting an unrecognised token instead.',
          'Fixes an issue where the Offline speech engine would collapse "chapter 7 verse 7" into the compound number "seventy-seven", causing Matthew 7:7 to not project.',
          'Fixes an issue where saying "now we will passage to the book of Psalms 23 verse 1" would not project Psalm 23:1 because the preamble phrase was not stripped before parsing.',
          'Fixes an issue where the Offline engine would output an unrecognised token in place of "First Corinthians" or "Second Corinthians", causing references to those books to fail.',
          'Fixes an issue where the Offline engine would misidentify "Colossians" as "Galatians" due to phonetic similarity, projecting the wrong book.',
          'Fixes an issue where the Offline engine would output the word "previous" or "next" in the chapter number slot, causing the chapter to be dropped and the reference to fail.',
          'Fixes an issue where the Offline engine would not recognise version names spoken as individual letters (e.g., "N K J V", "A M P", "M S G").',
          'Fixes an issue where saying "let\'s see the next verse" in Offline mode would trigger a translation switch to The Message instead of navigating to the next verse.',
          'Fixes an issue where the Offline mode badge in the Live Transcript panel would always display "WEB" regardless of the active speech mode.',
          'Fixes an issue where the app would crash silently on startup on some Windows systems due to a missing Chromium resource file.',
          'Fixes an issue where the Offline speech engine\'s grammar vocabulary did not include all 66 Bible book names, causing some books to be transcribed as unrecognised tokens.',
          'Fixes an issue where the Offline engine would use a smaller, less accurate recognition model that could not reliably handle rare Bible book names or conversational navigation commands.',
          'Fixes an issue where saying "Proverbs chapter 3 verse 1" would not project because the speech engine misheard the chapter number as a navigation word.',
          'Fixes an issue where saying "can we see Nehemiah chapter 4 verse 4" would not project because the phrase "we see" was misheard as the word "verse", placing the book name after the first verse cue and causing it to be missed.',
          'Fixes an issue where a transcript containing a Bible reference embedded in a longer sentence would not project because the book name appeared too far from the chapter cue word.',
          'Fixes an issue where the Offline engine would output the word "it" in the verse number slot, causing references to verse 8 to fail (e.g., "Ephesians chapter 3 verse 8").',
          'Fixes an issue where the Offline engine would not project a reference if the transcript began with a number word immediately before the book name (e.g., "two psalms 23 verse 4").',
          'Fixes an issue where the Offline engine would not project numbered books correctly when the ordinal appeared after the book name in the transcript (e.g., "timothy first chapter 2 verse 3").',
          'Fixes an issue where the Offline engine would not project references from books that have only one chapter (such as Philemon, Obadiah, 2 John, 3 John, and Jude) when a chapter number was spoken.',
          'Fixes an issue where saying "Second Samuel" or "Second Corinthians" would project the first-numbered book instead of the second due to the token window evaluating the book stem before the ordinal.',
          'Fixes various stability issues and includes additional performance improvements.',
        ],
      },
    ],
    releaseNotesFooter: 'Qworship Live Console is available for Windows. For support and documentation, visit qworship.com.',
    systemSpecificationsNote: 'System specifications will be published here soon.',
  },
  onlineCta: {
    heading: { before: 'Prefer to use', accent: 'Q-worship online ?' },
    body: guideCardDescription,
    primaryCta: 'Download',
    secondaryCta: 'Get started online',
    image: downloadOnlineCtaImage,
    imageAlt: 'Church auditorium with scripture on screen',
  },
}

export const aboutHeroCopy = {
  badge: 'WHO WE ARE',
  heading: { before: 'About', accent: 'Q-worship' },
  body: 'Q-worship is a product of Devine Digital Technologies (DDT) — a company dedicated to building purposeful technology for the Christian industry. Q-worship brings together voice-powered Bible search, live projection, song management, multi-integrations, and other rich features.',
  image: '/Photos/Heros/Hero-About.webp',
  imageAlt: 'Worship band leading a congregation on stage',
}

export const aboutCoreBeliefs: CoreBelief[] = [
  {
    id: 'create',
    icon: 'create',
    title: 'We Imagine',
    description:
      'We build tools that feel invisible in the moment and powerful in the result — so your team can focus entirely on ministry, not mechanics.',
  },
  {
    id: 'develop',
    icon: 'develop',
    title: 'We Build',
    description:
      'Practical church software that is stable, affordable, and easy to use. We believe every church — regardless of size or budget.',
  },
  {
    id: 'enable',
    icon: 'enable',
    title: 'We Empower',
    description:
      'DDT actively works to lower the barrier to entry so that the smallest congregation can present the Word with the same quality and confidence as the largest.',
  },
]

export const aboutInsights: { heading: string; items: InsightCard[] } = {
  heading: 'Built from the pulpit.\nRefined by every Sunday.',
  items: [
    {
      image: '/Photos/Heros/About-ministry.webp',
      imageAlt: 'Operator working on a laptop during a live event',
      title: 'Ministry first. Technology second.',
      description:
        "At Devine Digital Technologies, we don't build features for feature lists. Q-worship exists because real pastors in real churches needed real solutions — on a real Sunday morning. Every decision we make is filtered through one question: does this make Sunday easier for the person standing at the pulpit?",
    },
    {
      image: '/Photos/Heros/About%20-%20built.webp',
      imageAlt: 'Hand raised in worship before a glowing cross',
      title: 'Built for the moment that matters',
      description:
        "The moment a pastor opens their mouth to preach, the moment a worship leader lifts their hands, the moment a verse appears on screen — those are the moments DDT builds for. Q-worship exists so that technology never gets in the way of those moments again. That's not a mission statement. That's a Sunday-morning promise.",
    },
  ],
}

export const aboutWorkBenefits: WorkBenefit[] = [
  {
    title: 'Profit Sharing',
    description:
      "Every team member shares in the success of the platform. As Q-worship grows, so does your stake in it. We believe the people who build it should benefit from it. Join our referral program.",
  },
  {
    title: 'Flexible Remote Work',
    description:
      'Work from anywhere in the world. Our team spans multiple continents and time zones — united by a shared mission and a culture of trust and autonomy.',
  },
  {
    title: 'Mission-Driven Culture',
    description:
      "You're not just shipping software — you're equipping churches. Every line of code, every design decision, every support ticket is part of something bigger than a product.",
  },
  {
    title: 'Growth & Learning',
    description:
      "We invest in our team's growth. Access to courses, conferences, and mentorship — because the best version of Q-worship starts with the best version of you.",
  },
  {
    title: 'Meaningful Impact',
    description:
      'Q-worship is used in churches across multiple countries every Sunday. Your work reaches real congregations, real pastors, and real moments of worship — every single week.',
  },
  {
    title: 'Equipment Allowance',
    description:
      "Do your best work with the right tools. Every team member receives a dedicated equipment allowance to set up their ideal workspace — whether that's a home office, a co-working space, or a church tech booth.",
  },
]

export const referHeroCopy = {
  badge: 'REFERRAL PROGRAM',
  heading: { line1: 'Welcome to Q-worship', line2: 'Referral program' },
  body: "Every team member shares in the success of the platform. As Q-worship grows, so does your stake in it. We believe the people who build it should benefit from it. Join our referral program and start earning today.",
  bodyLines: [
    'Every team member shares in the success of the platform.',
    'As Q-worship grows, so does your stake in it.',
    'We believe the people who build it should benefit from it.',
    'Join our referral program and start earning today.',
  ],
  cta: 'Join Referral Programme',
  imageAlt: 'Worship team leading a congregation on stage',
}

export const referWhoWeAreCopy = {
  badge: aboutHeroCopy.badge,
  heading: { before: 'Led by', accent: 'pastors' },
  body: aboutHeroCopy.body,
  cta: 'Learn more',
  imageAlt: aboutHeroCopy.imageAlt,
}

export const referWorkBenefitsCopy = {
  heading: 'Why work with us !',
  cta: 'Join referral program',
}

export const referHowItWorksCopy = {
  heading: 'How it works',
  body: 'Join our referral steps in a few quick and easy steps and start earning.',
  cta: 'Get Started Today',
  steps: [
    {
      icon: 'edit_document',
      title: 'Apply online',
      description: 'Sign up for the referral program in minutes. No paperwork, no waiting — just a simple form to get you in.',
    },
    {
      icon: 'task_alt',
      title: 'Review & Account Setup',
      description: 'Our team reviews your application and sets up your referral account with a unique tracking link.',
    },
    {
      icon: 'payments',
      title: 'Start referring & Earning',
      description: 'Share your link with churches and ministries, and earn a share of the revenue for every successful referral.',
    },
  ],
}

export const aboutJobOpeningsCopy = {
  title: 'Current openings at Q-worship',
  intro:
    "Discover your own story while helping us empower others to tell theirs through our video software. Q-worship is growing! We need some first class individuals to help us achieve our goals. With the success of our products, the opportunities abound. We're very excited about our future and are eager to expand our team with passionate individuals looking to make a difference. Not all positions are needed immediately, but are listed here in case an exceptional candidate is discovered.",
}

export const aboutJobOpenings: JobOpening[] = [
  {
    id: 'core-rust',
    category: 'Core',
    title: 'Core Software Engineer | Rust',
    location: 'Remote',
    status: 'Active',
    intro:
      'As a Q-worship Core Software Engineer, you will develop the infrastructure and foundational technologies that power our platform. You will work on the engine that drives real-time Bible projection, voice command processing, and cross-platform presentation delivery — the invisible backbone that makes Sunday mornings run without a hitch.',
    philosophy:
      'We are looking for someone who enjoys working on the parts of an application that are invisible to the end user. You are language-agnostic and believe that innovation comes from discovery. You prioritize memory safety and concurrency in your work, and you understand that the stakes are high — when a pastor is mid-sermon, the software cannot fail.',
    skillsHeading: 'We are looking for individuals who possess the following skills:',
    skills: [
      'Proficiency in developing applications using Rust and modern C++',
      'Experience in building libraries that can be utilized across multiple platforms (macOS, Windows)',
      'Ability to pay attention to details while understanding the significance of timely, reliable updates',
      'Understanding of when to prioritize refactoring and when to defer it — especially in a live-service context',
      'Consistent willingness to learn and grow both personally and professionally',
      'Solid understanding of systems programming concepts including memory management, threading, and IPC',
    ],
    valuesHeading: 'Additionally, we highly value individuals who:',
    values: [
      'Are skilled in another programming language such as C# or Swift',
      'Possess exceptional written and verbal communication skills',
      'Take responsibility for projects, thrive with loosely defined specifications, and drive towards achieving results',
      'Have contributed to or maintained open-source Rust crates or cross-platform libraries',
      'Understand the unique performance demands of real-time presentation software',
    ],
    idealHeading: 'Our top engineers will ideally have:',
    ideal: [
      'Experience in writing and debugging high-performance multi-threaded libraries',
      'Familiarity with video and audio frameworks and low-level rendering pipelines',
      'Hands-on experience developing multithreaded, decoupled systems using actor frameworks and async/await, emphasizing message-driven design, non-blocking I/O, and memory-safe concurrency',
      'Experience with WebSocket-based real-time communication (relevant to our OBS Studio integration)',
      'A background in or genuine appreciation for church technology, AV production, or live event software',
    ],
  },
  {
    id: 'core-macos',
    category: 'Core',
    title: 'macOS Software Engineer',
    location: 'Remote',
    status: 'Active',
    intro:
      'As a Q-worship macOS Software Engineer, you will own the native macOS experience of the Q-worship Live Console — the desktop application that pastors and worship leaders rely on every Sunday. You will work at the intersection of performance, reliability, and user experience, ensuring that the macOS build of Q-worship feels native, fast, and rock-solid under the pressure of a live service.',
    philosophy:
      'We are looking for someone who cares deeply about the Apple platform — not just as a deployment target, but as a craft. You understand the macOS Human Interface Guidelines, you know when to reach for AppKit versus SwiftUI, and you take pride in building software that feels like it belongs on a Mac. You are comfortable working close to the metal when performance demands it.',
    skillsHeading: 'We are looking for individuals who possess the following skills:',
    skills: [
      'Proficiency in Swift and/or Objective-C for native macOS application development',
      'Experience with AppKit, SwiftUI, and the macOS application lifecycle',
      'Strong understanding of macOS-specific APIs including AVFoundation, CoreAudio, CoreGraphics, and ScreenCaptureKit',
      'Ability to diagnose and resolve performance bottlenecks in a real-time, UI-intensive application',
      'Experience with code signing, notarization, and macOS app distribution workflows',
      'Consistent willingness to learn and grow both personally and professionally',
    ],
    valuesHeading: 'Additionally, we highly value individuals who:',
    values: [
      'Have experience integrating Rust or C++ libraries into a Swift/Objective-C codebase via FFI or bridging headers',
      'Possess exceptional written and verbal communication skills',
      'Take responsibility for projects, thrive with loosely defined specifications, and drive towards achieving results',
      'Have shipped a macOS application to the Mac App Store or via direct distribution',
      'Understand the unique demands of live presentation software — where crashes are not an option',
    ],
    idealHeading: 'Our top engineers will ideally have:',
    ideal: [
      'Experience with NDI, Syphon, or other video output frameworks on macOS',
      "Familiarity with OBS Studio's WebSocket API or similar broadcast software integrations",
      'Experience with multi-window application architectures and cross-window communication on macOS',
      'Hands-on experience with audio device enumeration, routing, and real-time audio processing on macOS',
      'A background in or genuine appreciation for church technology, AV production, or live event software',
    ],
  },
  {
    id: 'sales-marketing',
    category: 'Sales',
    title: 'Sales & Marketing Representatives',
    location: 'South Africa',
    status: 'Active',
    intro:
      'As a Q-worship Sales & Marketing Representative based in South Africa, you will be the face of Q-worship and Devine Digital Technologies in one of our most important and fastest-growing markets. You will build relationships with churches, denominations, and ministry networks across South Africa — introducing them to a platform that can transform how they present the Word every Sunday.',
    philosophy:
      "We are looking for someone who is passionate about both technology and ministry. You don't need to be a software engineer — but you do need to understand the church environment deeply, communicate with genuine warmth and conviction, and have the drive to grow a market from the ground up. This is a role for someone who sees selling Q-worship not as a job, but as a calling.",
    skillsHeading: 'We are looking for individuals who possess the following skills:',
    skills: [
      'Proven experience in B2B or B2C sales, ideally in the technology, media, or non-profit/ministry sector',
      'Strong understanding of the South African church landscape — denominations, networks, and decision-making structures',
      'Excellent verbal and written communication skills in English; proficiency in Afrikaans or Zulu is a significant advantage',
      'Ability to conduct product demonstrations confidently, both in person and via video call',
      'Self-motivated with the ability to manage a pipeline, set targets, and report on progress independently',
      'Consistent willingness to learn and grow both personally and professionally',
    ],
    valuesHeading: 'Additionally, we highly value individuals who:',
    values: [
      'Have an existing network within South African churches, denominations, or Christian media organisations',
      'Possess experience with CRM tools (HubSpot, Salesforce, or similar) for pipeline management',
      'Take responsibility for their territory, thrive with loosely defined targets, and drive towards achieving results',
      'Have a genuine personal faith and understand the culture, language, and priorities of the church community',
      'Are comfortable representing a UK-based technology company to a local audience with cultural sensitivity and authenticity',
    ],
    idealHeading: 'Our top candidates will ideally have:',
    ideal: [
      'Experience selling SaaS or subscription-based software products',
      'A track record of building and growing a regional sales territory from early-stage',
      'Experience in church AV, media ministry, or worship technology — either professionally or as a volunteer',
      "Familiarity with Q-worship's core use cases: Bible projection, song management, live presentation, and OBS integration",
      'The ability to run community events, church tech workshops, or product demonstrations at conferences and denominational gatherings',
    ],
  },
  {
    id: 'core-windows',
    category: 'Core',
    title: 'Windows Software Engineer',
    location: 'Remote',
    status: 'Active',
    intro:
      'As a Q-worship Windows Software Engineer, you will own the native Windows experience of the Q-worship Live Console — the desktop application used by churches across the world every Sunday. You will build and maintain a high-performance, reliable Windows application that handles everything from real-time Bible projection and voice command processing to multi-display output and OBS Studio integration.',
    philosophy:
      'We are looking for someone who knows Windows development deeply — not just as a platform, but as an ecosystem. You understand Win32, WinUI, and the Windows driver model. You know how to squeeze performance out of the platform, how to handle multi-monitor setups gracefully, and how to ship software that works reliably across the wide diversity of Windows hardware found in church environments.',
    skillsHeading: 'We are looking for individuals who possess the following skills:',
    skills: [
      'Proficiency in C++ and/or C# for native Windows application development',
      'Experience with Win32 API, WinUI 3, or WPF for building desktop applications',
      'Strong understanding of Windows-specific APIs including DirectX, WASAPI, and Windows Media Foundation',
      'Ability to diagnose and resolve performance bottlenecks in a real-time, UI-intensive application',
      'Experience with Windows code signing, packaging (MSIX/APPX), and distribution via direct download or the Microsoft Store',
      'Consistent willingness to learn and grow both personally and professionally',
    ],
    valuesHeading: 'Additionally, we highly value individuals who:',
    values: [
      'Have experience integrating Rust or C++ libraries into a C# codebase via P/Invoke or COM interop',
      'Possess exceptional written and verbal communication skills',
      'Take responsibility for projects, thrive with loosely defined specifications, and drive towards achieving results',
      'Have shipped a Windows desktop application and managed its update lifecycle',
      'Understand the unique demands of live presentation software — where crashes are not an option',
    ],
    idealHeading: 'Our top engineers will ideally have:',
    ideal: [
      'Experience with NDI, Spout, or other video output frameworks on Windows',
      "Familiarity with OBS Studio's WebSocket API or similar broadcast software integrations",
      'Experience with multi-window and multi-monitor application architectures on Windows',
      'Hands-on experience with audio device enumeration, ASIO/WASAPI routing, and real-time audio processing on Windows',
      'A background in or genuine appreciation for church technology, AV production, or live event software',
    ],
  },
]

export const jobApplicationCountries = [
  'United States',
  'Canada',
  'United Kingdom',
  'South Africa',
  'Australia',
  'Other',
]

export function getJobOpeningById(id: string): JobOpening | undefined {
  return aboutJobOpenings.find((opening) => opening.id === id)
}

export const aboutFaqTeaserItems: FaqItem[] = [
  faqItems.find((item) => item.id === 'what-is-qworship')!,
  faqItems.find((item) => item.id === 'who-is-it-for')!,
  { ...faqItems.find((item) => item.id === 'who-is-it-for')!, id: 'who-is-it-for-duplicate' },
  faqItems.find((item) => item.id === 'operating-systems')!,
]

export const authShowcaseSlides = [
  {
    id: 'hands-free-bible',
    image: '/Photos/login/Group%201171276018.webp',
    alt: 'Hands-free Bible voice search with scripture on screen',
    title: 'Q-worship Hands free Bible',
    body: 'Your church service, Powered by voice.',
  },
  {
    id: 'on-screen-bible',
    image: '/Photos/login/Group%201171276012.webp',
    alt: 'On-screen Bible search and verse selection',
    title: 'On-screen Bible',
    body: 'Search any scripture across all 66 books in seconds.',
  },
  {
    id: 'announcements',
    image: '/Photos/login/image%20149.webp',
    alt: 'Sunday announcements slide preview',
    title: 'Announcements',
    body: 'Keep your church in the loop — right inside your service.',
  },
  {
    id: 'entire-team',
    image: '/Photos/login/Group%201171276012.webp',
    alt: 'Team collaboration with live production tools',
    title: 'Built For the Entire Team',
    body: 'Built with tools to support the entire team',
  },
] as const

/** @deprecated Use authShowcaseSlides */
export const loginShowcaseSlides = authShowcaseSlides

export const images = {
  logo: '/Photos/logo.png',
  heroFrame: '/Photos/Frame%201171275872.webp',
  handsFreeFrame: '/Photos/Group%201171275977.webp',
  handsFreeStage: '/Photos/hands-free-stage.webp',
  rectanglePortrait,
  hero:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDYGRFuNG4vm0daVzCMIGtTpA6iHCAbNtv6ej8DEBg6PyDtB8seToBnjMS1VeB_k7LSZqFV-pBiavQRDS-QNCdmpng92C8uq9tJr0GyQMkgsl1tQIN4FijvSMeJbRKAkTymr094S4WLTV0LNJ8xLKcbVCX3sgMm9GVt0VvH1J3eeQy_PFOZhiAw0i-xFfu-D-TJbAccpxtjBdOoHFJx-cwSwGEBQstDkqWyQ0fD5NEw87sEJxD4tUDSCrdNIir0RTMS5BseK8oQbjQo',
  handsFree:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAywanEgW5IqAtQHIiOEdxjc72AMFB3CqkczeXRn7QfkFV1SIw-plJpFPaUcUOdNX5qV8nuZMOnjTjZkrLKvnybnQVEBMD8FsG96c9J2bk0hd4aPeDcttgAAobgDgertbtNe5oRKD1puetUDXQuQFtJA-NkB5VmPfSJKH4u6gt_7LpZvalD1RsRR2KkWqrH_7KeDmGJb1XXn9i_L_zp4Fse6hzo-i5Wz0y9Tbl6gLCtKiC3cl6l6CY5mh2-2zABqLTIuOMcpRb42uSR',
  pastor: pastorForPastor,
  partners:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBEulfurEaig4HkDRWZHLhOHiW3eycUCF3M42BaGblBzntXMdMFWZZIEXqVqqIrey50IkNrT0h-EaWS_3gaQzosqVdYnyOarGCsB7yy0KKmOcudI0Kj8dCTT7h-XvilnTmE5j9bCMvtyVYEjnWfmuQf-NpRiS0qhXtF47hym7Y1fABSA9dqj8325BsvAKmjJjIIl-gdUhFGcZC0PJe2wpQXOAzHlxqFa1EvYrrNpg4dQK1slcfLmSBup_agmDtTv-4LD8SiCbEld0TO',
  cta: '/Photos/lastlast.webp',
  ctaMobile: '/Photos/Pastors.webp',
  featuresHero: '/Photos/features/Rectangle%2042300.webp',
  referCarousel: [
    '/Photos/ReferAndEarn/referral-banner-wide.webp',
    '/Photos/ReferAndEarn/carousel-display-settings.webp',
    '/Photos/ReferAndEarn/carousel-audience-screen.webp',
    '/Photos/ReferAndEarn/carousel-lyrics.webp',
  ],
  referPastor: '/Photos/ReferAndEarn/carousel-pastor.webp',
  referThanksTick: '/Photos/ReferAndEarn/thanks-tick.png',
}

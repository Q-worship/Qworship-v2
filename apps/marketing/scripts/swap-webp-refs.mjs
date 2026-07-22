import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

const relPaths = [
  'Photos/login/Group%201171276018.png',
  'Photos/login/Group%201171276012.png',
  'Photos/onboarding/speech-to-text.png',
  'Photos/Service%20order.png',
  'Photos/Songs.png',
  'Photos/On-screen%20bible.png',
  'Photos/Hands%20free%20Bible.png',
  'Photos/Announcements.png',
  'Photos/Rectangle%209.png',
  'Photos/pASTORS%20(2).png',
  'Photos/Download%201.png',
  'Photos/Download%202.png',
  'Photos/eas%20to%20use.png',
  'Photos/onlin%20and....png',
  'Photos/lightweight.png',
  'Photos/third-builder.png',
  'Photos/NDL.png',
  'Photos/Easy%20to%20use.png',
  'Photos/Praise%20and%20Worship.png',
  'Photos/Pastors.png',
  'Photos/features/Rectangle%2042300.png',
  'Photos/feature%201.png',
  'Photos/features/3.png',
  'Photos/features/ghgh.png',
  'Photos/features/song.png',
  'Photos/feature%203.png',
  'Photos/Guides/SUQL.png',
  'Photos/Guides/SUYD.png',
  'Photos/Guides/NTJS.png',
  'Photos/Guides/SYVO.png',
  'Photos/Guides/BYS.png',
  'Photos/Guides/ULTB.png',
  'Photos/Heros/Hero-guides.png',
  'Photos/Heros/Hero-FAQ.png',
  'Photos/Heros/Download%20-%20image.png',
  'Photos/Heros/Hero-About.png',
  'Photos/Heros/About-ministry.png',
  'Photos/Heros/About%20-%20built.png',
  'Photos/Frame%201171275872.png',
  'Photos/Group%201171275977.png',
  'Photos/hands-free-stage.png',
  'Photos/lastlast.png',
  'Photos/login/image%20149.png',
]

const files = ['src/lib/theme.ts', 'src/lib/onboardingSlides.ts']

for (const file of files) {
  const filePath = path.join(root, file)
  let content = readFileSync(filePath, 'utf8')
  let count = 0

  for (const rel of relPaths) {
    const oldStr = rel
    const newStr = rel.replace(/\.png$/, '.webp')
    const before = content
    content = content.split(oldStr).join(newStr)
    if (content !== before) count += 1
  }

  writeFileSync(filePath, content, 'utf8')
  console.log(`${file}: replaced ${count} distinct path(s)`)
}

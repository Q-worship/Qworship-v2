import sharp from 'sharp'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..', 'public')

// [relative path from public/, max width to resize to]
const targets = [
  // Login / onboarding
  ['Photos/login/Group 1171276018.png', 1400],
  ['Photos/login/Group 1171276012.png', 1400],
  ['Photos/login/image 149.png', 1400],
  ['Photos/onboarding/speech-to-text.png', 1400],

  // Feature spotlight screenshots
  ['Photos/Service order.png', 1200],
  ['Photos/Songs.png', 1200],
  ['Photos/On-screen bible.png', 1200],
  ['Photos/Hands free Bible.png', 1200],
  ['Photos/Announcements.png', 1200],
  ['Photos/Rectangle 9.png', 1200],
  ['Photos/pASTORS (2).png', 1200],
  ['Photos/Download 1.png', 1200],
  ['Photos/Download 2.png', 1200],
  ['Photos/eas to use.png', 1200],
  ['Photos/onlin and....png', 1200],
  ['Photos/lightweight.png', 1200],
  ['Photos/third-builder.png', 1200],
  ['Photos/NDL.png', 1200],
  ['Photos/Easy to use.png', 1200],
  ['Photos/Praise and Worship.png', 1200],
  ['Photos/Pastors.png', 1200],
  ['Photos/features/Rectangle 42300.png', 1200],
  ['Photos/feature 1.png', 1200],
  ['Photos/features/3.png', 1200],
  ['Photos/features/ghgh.png', 1200],
  ['Photos/features/song.png', 1200],
  ['Photos/feature 3.png', 1200],
  ['Photos/feature 4.png', 1200],

  // Guide cards (displayed small in grid, larger on detail hero)
  ['Photos/Guides/SUQL.png', 1400],
  ['Photos/Guides/SUYD.png', 1400],
  ['Photos/Guides/NTJS.png', 1400],
  ['Photos/Guides/SYVO.png', 1400],
  ['Photos/Guides/BYS.png', 1400],
  ['Photos/Guides/ULTB.png', 1400],

  // Hero photography
  ['Photos/Heros/Hero-guides.png', 1600],
  ['Photos/Heros/Hero-FAQ.png', 1600],
  ['Photos/Heros/Download - image.png', 1600],
  ['Photos/Heros/Hero-About.png', 1600],
  ['Photos/Heros/About-ministry.png', 1400],
  ['Photos/Heros/About - built.png', 1400],

  // Misc referenced assets
  ['Photos/Frame 1171275872.png', 1400],
  ['Photos/Group 1171275977.png', 1400],
  ['Photos/hands-free-stage.png', 1400],
  ['Photos/lastlast.png', 1400],
]

const results = []

for (const [rel, maxWidth] of targets) {
  const srcPath = path.join(root, rel)
  if (!existsSync(srcPath)) {
    results.push({ rel, status: 'MISSING' })
    continue
  }

  const outPath = srcPath.replace(/\.png$/i, '.webp')
  const beforeBytes = statSync(srcPath).size

  const image = sharp(srcPath)
  const metadata = await image.metadata()
  const resizeWidth = metadata.width && metadata.width > maxWidth ? maxWidth : undefined

  await image
    .resize(resizeWidth ? { width: resizeWidth } : undefined)
    .webp({ quality: 80 })
    .toFile(outPath)

  const afterBytes = statSync(outPath).size

  results.push({
    rel,
    status: 'OK',
    beforeKB: Math.round(beforeBytes / 1024),
    afterKB: Math.round(afterBytes / 1024),
    savedPct: Math.round((1 - afterBytes / beforeBytes) * 100),
    origWidth: metadata.width,
    resizedTo: resizeWidth ?? metadata.width,
  })
}

let totalBefore = 0
let totalAfter = 0
for (const r of results) {
  if (r.status === 'OK') {
    totalBefore += r.beforeKB
    totalAfter += r.afterKB
    console.log(
      `${r.status.padEnd(8)} ${r.rel.padEnd(45)} ${String(r.beforeKB).padStart(6)}KB -> ${String(r.afterKB).padStart(6)}KB  (-${r.savedPct}%)  ${r.origWidth}px -> ${r.resizedTo}px`,
    )
  } else {
    console.log(`${r.status.padEnd(8)} ${r.rel}`)
  }
}

console.log(`\nTotal: ${totalBefore}KB -> ${totalAfter}KB (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)`)

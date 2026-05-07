import fs from 'fs';
import path from 'path';

const VERSIONS = ['NKJV', 'NIV', 'ESV', 'AMP', 'MSG']; // Removed KJV as we already have it
const TARGET_DIR = '/Users/rebeccashewuri/Documents/development/qworship/Qworship-v2/apps/server/src/modules/bible/data';

function cleanText(text: string) {
  if (!text) return "";
  return text
    .replace(/<S>\d+<\/S>/g, '') 
    .replace(/<sup>.*?<\/sup>/g, '') 
    .replace(/<.*?>/g, '') 
    .replace(/\s+/g, ' ') 
    .trim();
}

async function fetchWithRetry(url: string, retries = 5): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429) {
                    const wait = (i + 1) * 30000; 
                    console.log(`[Rate Limit] Waiting ${wait/1000}s for ${url}`);
                    await new Promise(r => setTimeout(r, wait));
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (e: any) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function run() {
    for (const version of VERSIONS) {
        const filePath = path.join(TARGET_DIR, `${version.toLowerCase()}.json`);
        let allVerses: any[] = [];
        
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                if (content && content !== '[]') {
                    allVerses = JSON.parse(content);
                    console.log(`[${version}] Resuming with ${allVerses.length} verses.`);
                }
            } catch (e) {
                console.log(`[${version}] File corrupted or empty, starting fresh.`);
                allVerses = [];
            }
        }

        console.log(`[${version}] Fetching book list...`);
        const books = await fetchWithRetry(`https://bolls.life/get-books/${version}/`);
        const standardBooks = books.filter((b: any) => b.bookid <= 66);

        for (const book of standardBooks) {
            const bookId = book.bookid;
            const bookName = book.name;
            const chapters = book.chapters;

            // Check if this book is already fully downloaded
            const existingInBook = allVerses.filter(v => v.book === bookName);
            const lastChapter = existingInBook.length > 0 ? Math.max(...existingInBook.map(v => v.chapter)) : 0;

            if (lastChapter >= chapters) {
                continue;
            }

            console.log(`  [${version}] Downloading ${bookName} starting from chapter ${lastChapter + 1}...`);

            for (let ch = lastChapter + 1; ch <= chapters; ch++) {
                try {
                    const data = await fetchWithRetry(`https://bolls.life/get-chapter/${version}/${bookId}/${ch}/`);
                    if (Array.isArray(data)) {
                        data.forEach(v => {
                            allVerses.push({
                                book: bookName,
                                chapter: ch,
                                verse: v.verse,
                                text: cleanText(v.text),
                                version: version.toLowerCase()
                            });
                        });
                        fs.writeFileSync(filePath, JSON.stringify(allVerses));
                    }
                    await new Promise(r => setTimeout(r, 600)); // Slightly faster (600ms)
                } catch (e: any) {
                    console.error(`    [${version}] Error in ${bookName} Ch ${ch}: ${e.message}`);
                }
            }
        }
        console.log(`✅ [${version}] Complete! Total verses: ${allVerses.length}`);
    }
}

run().catch(console.error);

/**
 * Servizio per dividere il testo di un libro in blocchi intelligenti.
 *
 * Regole:
 * 1. Cerca di dividere ai confini dei capitoli
 * 2. Se non trova capitoli, divide ai confini dei paragrafi
 * 3. Non taglia MAI a metà frase
 * 4. Ogni blocco ha circa la stessa lunghezza (configurabile)
 */

export interface Block {
  number: number
  title: string
  content: string
  characterCount: number
  wordCount: number
  startsAtChapter: boolean
}

// Pattern comuni per riconoscere i titoli dei capitoli
const CHAPTER_PATTERNS = [
  /^(?:capitolo|cap\.?)\s+\d+/i,
  /^(?:chapter)\s+\d+/i,
  /^(?:parte)\s+\d+/i,
  /^(?:sezione)\s+\d+/i,
  /^(?:libro)\s+\d+/i,
  /^\d+\.\s+/,
  /^(?:I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*[\.\-\:]/,
  /^(?:CAPITOLO|PARTE|SEZIONE)\s+/,
]

function isChapterHeading(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 100) return false
  return CHAPTER_PATTERNS.some(pattern => pattern.test(trimmed))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _isSentenceEnd(text: string): boolean {
  return /[.!?…»"']\s*$/.test(text.trim())
}

function findBestSplitPoint(text: string, targetPos: number, margin: number = 500): number {
  // Cerca il punto migliore per dividere vicino a targetPos
  const searchStart = Math.max(0, targetPos - margin)
  const searchEnd = Math.min(text.length, targetPos + margin)
  const searchArea = text.substring(searchStart, searchEnd)

  // 1. Cerca un inizio capitolo nella zona
  const lines = searchArea.split('\n')
  let pos = searchStart
  for (const line of lines) {
    if (isChapterHeading(line) && Math.abs(pos - targetPos) < margin) {
      return pos
    }
    pos += line.length + 1
  }

  // 2. Cerca un doppio a-capo (fine paragrafo)
  let bestParaBreak = -1
  let bestParaDist = Infinity
  const paraBreakRegex = /\n\n/g
  let match
  while ((match = paraBreakRegex.exec(searchArea)) !== null) {
    const absPos = searchStart + match.index + 2
    const dist = Math.abs(absPos - targetPos)
    if (dist < bestParaDist) {
      bestParaDist = dist
      bestParaBreak = absPos
    }
  }
  if (bestParaBreak !== -1) return bestParaBreak

  // 3. Cerca la fine di una frase
  let bestSentEnd = -1
  let bestSentDist = Infinity
  const sentEndRegex = /[.!?…»"']\s+/g
  while ((match = sentEndRegex.exec(searchArea)) !== null) {
    const absPos = searchStart + match.index + match[0].length
    const dist = Math.abs(absPos - targetPos)
    if (dist < bestSentDist) {
      bestSentDist = dist
      bestSentEnd = absPos
    }
  }
  if (bestSentEnd !== -1) return bestSentEnd

  // 4. Fallback: dividi al doppio a-capo più vicino
  return targetPos
}

export function splitTextIntoBlocks(
  text: string,
  targetBlockCount: number = 10
): Block[] {
  if (!text || text.trim().length === 0) return []

  const cleanText = text.trim()
  const totalChars = cleanText.length

  // Calcola dimensione target per blocco
  const targetBlockSize = Math.floor(totalChars / targetBlockCount)

  // Limite minimo e massimo per blocco
  const minBlockSize = Math.min(500, targetBlockSize * 0.3)
  const maxBlockSize = targetBlockSize * 2

  const blocks: Block[] = []
  let currentPos = 0
  let blockNumber = 1

  while (currentPos < totalChars) {
    const remaining = totalChars - currentPos

    // Se il testo rimanente è piccolo, fallo diventare l'ultimo blocco
    if (remaining <= targetBlockSize * 1.3) {
      const content = cleanText.substring(currentPos).trim()
      if (content.length > 0) {
        blocks.push({
          number: blockNumber,
          title: generateBlockTitle(content, blockNumber),
          content,
          characterCount: content.length,
          wordCount: content.split(/\s+/).length,
          startsAtChapter: isChapterHeading(content.split('\n')[0] || ''),
        })
      }
      break
    }

    // Trova il punto migliore per dividere
    const targetEnd = currentPos + targetBlockSize
    const splitPoint = findBestSplitPoint(cleanText, targetEnd)

    // Assicurati che il blocco non sia troppo piccolo o troppo grande
    let actualEnd = splitPoint
    if (actualEnd - currentPos < minBlockSize) {
      actualEnd = currentPos + targetBlockSize
    }
    if (actualEnd - currentPos > maxBlockSize) {
      actualEnd = findBestSplitPoint(cleanText, currentPos + targetBlockSize, 1000)
    }

    // Non superare la fine del testo
    actualEnd = Math.min(actualEnd, totalChars)

    const content = cleanText.substring(currentPos, actualEnd).trim()

    if (content.length > 0) {
      blocks.push({
        number: blockNumber,
        title: generateBlockTitle(content, blockNumber),
        content,
        characterCount: content.length,
        wordCount: content.split(/\s+/).length,
        startsAtChapter: isChapterHeading(content.split('\n')[0] || ''),
      })
      blockNumber++
    }

    currentPos = actualEnd
  }

  return blocks
}

function generateBlockTitle(content: string, blockNumber: number): string {
  // Prova a usare il titolo del capitolo se presente
  const firstLine = content.split('\n')[0]?.trim() || ''

  if (isChapterHeading(firstLine)) {
    return firstLine
  }

  return `Blocco ${blockNumber}`
}

/**
 * Conta i blocchi suggeriti in base alla lunghezza del testo
 */
export function suggestBlockCount(characterCount: number): number {
  // Target: ~3000-5000 caratteri per blocco (circa 2-3 minuti di lettura)
  const targetCharsPerBlock = 4000
  const suggested = Math.round(characterCount / targetCharsPerBlock)
  return Math.max(3, Math.min(suggested, 100)) // min 3, max 100 blocchi
}

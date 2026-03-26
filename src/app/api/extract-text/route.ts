import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Il file supera i 50MB' }, { status: 400 })
    }

    let text = ''
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.txt')) {
      text = await file.text()
    } else if (fileName.endsWith('.docx')) {
      // Estrai testo da DOCX usando mammoth
      const buffer = Buffer.from(await file.arrayBuffer())
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (fileName.endsWith('.pdf')) {
      // Estrai testo da PDF usando unpdf
      const arrayBuffer = await file.arrayBuffer()
      const { extractText } = await import('unpdf')
      const { text: pdfText } = await extractText(arrayBuffer)
      text = Array.isArray(pdfText) ? pdfText.join('\n\n') : String(pdfText)
    } else {
      return NextResponse.json(
        { error: 'Formato non supportato. Usa PDF, DOCX o TXT.' },
        { status: 400 }
      )
    }

    // Pulisci il testo
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: 'Il file non contiene abbastanza testo (minimo 100 caratteri). Assicurati che il PDF non sia un\'immagine scansionata.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      text,
      characterCount: text.length,
      wordCount: text.split(/\s+/).length,
      fileName: file.name,
    })
  } catch (error: any) {
    console.error('Errore estrazione testo:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'elaborazione del file: ' + (error.message || 'Riprova.') },
      { status: 500 }
    )
  }
}

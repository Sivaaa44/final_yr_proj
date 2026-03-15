// src/utils/documentExtractor.ts
import * as pdfjsLib from 'pdfjs-dist'  // Standard import—no legacy path!
import Tesseract from 'tesseract.js'
import mammoth from 'mammoth'

// Set worker src using Vite's import.meta.url (fixes worker errors automatically)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export interface ExtractedDocument {
  text: string
  fileName: string
  fileType: string
}

export const extractDocumentText = async (file: File): Promise<ExtractedDocument> => {
  const fileName = file.name
  const fileType = file.type || fileName.toLowerCase()

  console.log(`📄 Reading: ${fileName} (${fileType})`)

  try {
    let text = ''

    // PDF — pdfjs-dist (works perfectly in 2025 Vite/TS)
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      console.log('  → Processing PDF...')
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n\n'
      }
      text = fullText
    }

    // Images — OCR (Hindi + English)
    else if (fileType.startsWith('image/')) {
      console.log('  → Processing image with OCR...')
      const { data: { text: ocrText } } = await Tesseract.recognize(file, 'eng+hin', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR: ${Math.round(m.progress * 100)}%`)
          }
        }
      })
      text = ocrText
    }

    // DOCX — mammoth (unchanged)
    else if (fileType.includes('officedocument') || fileName.endsWith('.docx')) {
      console.log('  → Processing DOCX...')
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      text = result.value
    }

    else {
      throw new Error('Only PDF, images, and .docx supported')
    }

    console.log(`✅ Done! Extracted ${text.length} characters`)
    return {
      text: text.trim(),
      fileName,
      fileType: fileType.includes('pdf') ? 'pdf' : fileType.includes('image') ? 'image' : 'docx'
    }

  } catch (error) {
    console.error('❌ Extraction failed:', error)
    throw new Error('Could not read this file. Try a clear PDF, photo, or Word doc.')
  }
}
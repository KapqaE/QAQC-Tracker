// oxlint-disable-next-line import/default -- Vite imports the worker module as bundled browser source.
import pdfWorkerSource from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
import type {
  PDFDocumentLoadingTask,
  PDFWorker as PDFWorkerInstance,
} from 'pdfjs-dist';

import {
  hasMeaningfulWirPdfExtraction,
  mergeWirPdfExtraction,
  parseWirFilename,
  parseWirPdfText,
  type WirPdfExtractedFields,
} from '@/lib/wir/pdf-extraction-parser';

export type WirPdfExtractionProgress = {
  label: string;
  percent: number;
};
type PdfJsWorkerConstructor = new (options: {
  port: Worker;
}) => PDFWorkerInstance;

const MAX_WIR_PDF_BYTES = 60 * 1024 * 1024;
const OCR_PAGE_LIMIT = 7;

function readableError(error: unknown) {
  if (error instanceof Error && /password/i.test(error.message))
    return 'Password-protected PDFs cannot be extracted.';
  return 'The WIR fields could not be extracted. The PDF was discarded; you can try another file or continue manually.';
}

export async function extractWirPdfInBrowser(
  file: File,
  onProgress: (progress: WirPdfExtractionProgress) => void,
  onFilenameParsed?: (fields: WirPdfExtractedFields) => void,
): Promise<WirPdfExtractedFields> {
  if (
    !file.name.toLowerCase().endsWith('.pdf') &&
    file.type !== 'application/pdf'
  )
    throw new Error('Select a PDF file.');
  if (!file.size || file.size > MAX_WIR_PDF_BYTES)
    throw new Error('The PDF must be smaller than 60 MB.');

  const signature = new TextDecoder('ascii').decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (signature !== '%PDF-')
    throw new Error('The selected file is not a valid PDF.');
  const filenameFields = parseWirFilename(file.name);
  onFilenameParsed?.(filenameFields);

  let bytes: Uint8Array | null = null;
  let loadingTask: PDFDocumentLoadingTask | null = null;
  let pdfWorker: PDFWorkerInstance | null = null;
  let pdfWorkerPort: Worker | null = null;
  let pdfWorkerObjectUrl: string | null = null;
  let ocrWorker: {
    recognize(image: HTMLCanvasElement): Promise<{ data: { text: string } }>;
    terminate(): Promise<unknown>;
  } | null = null;
  let extractedText = '';

  try {
    onProgress({ label: 'Reading the PDF locally...', percent: 5 });
    bytes = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await import('pdfjs-dist');
    pdfWorkerObjectUrl = URL.createObjectURL(
      new Blob([pdfWorkerSource], { type: 'text/javascript' }),
    );
    pdfWorkerPort = new Worker(pdfWorkerObjectUrl, { type: 'module' });
    const BrowserPdfWorker =
      pdfjs.PDFWorker as unknown as PdfJsWorkerConstructor;
    pdfWorker = new BrowserPdfWorker({ port: pdfWorkerPort });
    loadingTask = pdfjs.getDocument({ data: bytes, worker: pdfWorker });
    const loadedDocument = await loadingTask.promise;

    const pagesToRead = Math.min(loadedDocument.numPages, OCR_PAGE_LIMIT);
    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await loadedDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      extractedText += `\n${content.items.map((item: unknown) => (typeof item === 'object' && item && 'str' in item ? String(item.str) : '')).join(' ')}`;
      page.cleanup();
    }

    let fields = parseWirPdfText(extractedText);
    if (
      !hasMeaningfulWirPdfExtraction(fields) ||
      extractedText.replace(/\s/g, '').length < 180
    ) {
      const { createWorker } = await import('tesseract.js');
      const targetPages = Array.from(
        { length: pagesToRead },
        (_, index) => index + 1,
      );
      if (!targetPages.length) targetPages.push(1);
      ocrWorker = await createWorker('eng', 1, {
        cacheMethod: 'none',
        logger: (message) => {
          if (message.status === 'recognizing text') {
            onProgress({
              label: 'Reading scanned form fields locally...',
              percent: Math.min(92, 18 + Math.round(message.progress * 70)),
            });
          }
        },
      });

      for (let index = 0; index < targetPages.length; index += 1) {
        const pageNumber = targetPages[index];
        onProgress({
          label: `Reading scanned page ${pageNumber} of ${pagesToRead} locally...`,
          percent: 18 + Math.round((index / targetPages.length) * 70),
        });
        const page = await loadedDocument.getPage(pageNumber);
        const unitViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: Math.max(1, 1800 / unitViewport.width),
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context)
          throw new Error('Canvas extraction is unavailable in this browser.');
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          background: '#ffffff',
        }).promise;
        const recognized = await ocrWorker.recognize(canvas);
        extractedText += `\n${recognized.data.text}`;
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
      fields = parseWirPdfText(extractedText);
    }

    const mergedFields = mergeWirPdfExtraction(filenameFields, fields);
    if (!hasMeaningfulWirPdfExtraction(mergedFields))
      throw new Error('No recognizable WIR fields were found.');
    onProgress({
      label: 'Editable fields are ready. The PDF has been discarded.',
      percent: 100,
    });
    return mergedFields;
  } catch (error) {
    if (
      error instanceof Error &&
      [
        'Select a PDF file.',
        'The PDF must be smaller than 60 MB.',
        'The selected file is not a valid PDF.',
      ].includes(error.message)
    )
      throw error;
    throw new Error(readableError(error), { cause: error });
  } finally {
    extractedText = '';
    await ocrWorker?.terminate().catch(() => undefined);
    await loadingTask?.destroy().catch(() => undefined);
    pdfWorker?.destroy();
    pdfWorkerPort?.terminate();
    if (pdfWorkerObjectUrl) URL.revokeObjectURL(pdfWorkerObjectUrl);
    try {
      bytes?.fill(0);
    } catch {
      /* The PDF.js worker may already own the transferred buffer. */
    }
    bytes = null;
    ocrWorker = null;
    loadingTask = null;
    pdfWorker = null;
    pdfWorkerPort = null;
    pdfWorkerObjectUrl = null;
  }
}

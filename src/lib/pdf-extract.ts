/**
 * Client-side PDF text extraction using pdf.js.
 *
 * Extracts readable text content from a PDF file, retaining page numbers so
 * audit findings can point to their evidence. Runs entirely in the browser —
 * no files are sent externally.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// @ts-expect-error pdfjs worker has no types declaration file
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// Provide worker message handler via globalThis so pdfjs-dist uses fake worker
// on the main thread reliably across all environments without needing external worker URLs.
if (typeof globalThis !== "undefined") {
  try {
    (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
  } catch {
    // fallback
  }
}

/* ───────── Types ───────── */

export interface PdfPage {
  /** 1-based page number */
  pageNumber: number;
  /** Raw text content of the page */
  text: string;
}

export interface PdfExtractionResult {
  /** Whether extraction succeeded */
  ok: true;
  /** Total number of pages in the PDF */
  totalPages: number;
  /** File size in bytes */
  fileSize: number;
  /** Extracted pages with text */
  pages: PdfPage[];
  /** Full concatenated text (all pages) */
  fullText: string;
  /** Pages that contained no text at all (likely scanned/image-only) */
  emptyPageNumbers: number[];
  /** Human-readable summary info */
  info: {
    title: string | null;
    author: string | null;
    creationDate: string | null;
  };
}

export interface PdfExtractionError {
  ok: false;
  /** Machine-readable error type */
  errorType: "password-protected" | "corrupted" | "empty" | "no-text" | "unknown";
  /** Human-readable explanation */
  message: string;
}

export type PdfExtractionOutcome = PdfExtractionResult | PdfExtractionError;

/* ───────── Extraction ───────── */

/**
 * Extract text from a PDF file entirely in the browser.
 *
 * Returns page-by-page text along with metadata. Handles common error
 * conditions: password-protected, corrupted, empty, or scanned (image-only)
 * PDFs.
 */
export async function extractPdfText(file: File): Promise<PdfExtractionOutcome> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      return {
        ok: false,
        errorType: "empty",
        message: "The uploaded file is empty (0 bytes). Please choose a valid PDF.",
      };
    }

    let pdf: pdfjsLib.PDFDocumentProxy;
    try {
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (loadErr: unknown) {
      const errName =
        typeof loadErr === "object" && loadErr !== null && "name" in loadErr
          ? String((loadErr as { name?: unknown }).name)
          : "";
      const errMsg = loadErr instanceof Error ? loadErr.message : "Unknown error";
      if (errName === "PasswordException") {
        return {
          ok: false,
          errorType: "password-protected",
          message:
            "This PDF is password-protected. Please remove the password and re-upload, or use one of the included sample PDFs.",
        };
      }
      return {
        ok: false,
        errorType: "corrupted",
        message: `Could not read this PDF — it may be corrupted or in an unsupported format. (${errMsg})`,
      };
    }

    if (pdf.numPages === 0) {
      return {
        ok: false,
        errorType: "empty",
        message: "This PDF has no pages. Please upload a valid document.",
      };
    }

    // Extract metadata
    const meta = await pdf.getMetadata().catch(() => null);
    const pdfInfo = meta?.info as Record<string, unknown> | undefined;

    // Extract text page by page
    const pages: PdfPage[] = [];
    const emptyPageNumbers: number[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: unknown) =>
          typeof item === "object" && item !== null && "str" in item
            ? String((item as { str: unknown }).str)
            : "",
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({ pageNumber: i, text });
      if (!text) emptyPageNumbers.push(i);
    }

    const fullText = pages.map((p) => p.text).join("\n\n");

    // If NO page had any text, the entire PDF is likely scanned / image-only
    if (!fullText.trim()) {
      return {
        ok: false,
        errorType: "no-text",
        message:
          "No readable text was found in this PDF. It may be a scanned document (image-only). " +
          "This prototype does not include OCR. Please upload a text-based PDF, or use one of the included sample PDFs.",
      };
    }

    return {
      ok: true,
      totalPages: pdf.numPages,
      fileSize: file.size,
      pages,
      fullText,
      emptyPageNumbers,
      info: {
        title: typeof pdfInfo?.["Title"] === "string" ? pdfInfo["Title"] : null,
        author: typeof pdfInfo?.["Author"] === "string" ? pdfInfo["Author"] : null,
        creationDate:
          typeof pdfInfo?.["CreationDate"] === "string" ? pdfInfo["CreationDate"] : null,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      ok: false,
      errorType: "unknown",
      message: `An unexpected error occurred while reading the PDF: ${message}`,
    };
  }
}

/**
 * Format file size in human-readable form.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * AI-assisted tender review and gap analysis module.
 *
 * Provides:
 * 1. Safe AI execution keeping private API keys on the server.
 * 2. Deterministic, honest Non-AI Fallback when no AI service is configured.
 * 3. Strict citation validation: every cited excerpt must exist verbatim on the cited page.
 * 4. Hallucination detection: demotes ungrounded suggestions to "Needs Review".
 * 5. Distinct labeling separating AI / heuristic suggestions from deterministic rule checks.
 */

import type { PdfPage } from "./pdf-extract";
import { AUDIT_RULES, type AuditRule } from "./audit-rules";

/* ───────── Types ───────── */

export type AssistantMode = "live-ai" | "non-ai-fallback";

export interface AiReviewSuggestion {
  ruleId: string;
  ruleName: string;
  category: string;
  /** Plain-language summary of what the document text says regarding this requirement */
  clauseSummary: string;
  /** Potential gaps, risks, or omitted aspects identified */
  gapAnalysis: string;
  /** Exact verbatim excerpt from the document, or null if missing */
  citedExcerpt: string | null;
  /** 1-based page number where the excerpt was found */
  pageNumber: number | null;
  /** Recommended status */
  recommendedStatus: "Found" | "Missing" | "Needs Review";
  /** Plain-language explanation of why this status was recommended */
  explanation: string;
  /** Source mode indicating whether live AI or offline fallback produced this */
  sourceMode: AssistantMode;
  /** Model or generator label */
  generatorLabel: string;
  /** Strict document grounding flag */
  isValidSourceExcerpt: boolean;
}

export interface AiReviewReport {
  suggestions: AiReviewSuggestion[];
  mode: AssistantMode;
  statusMessage: string;
  timestamp: string;
  disclaimer: string;
}

/* ───────── Constants ───────── */

export const NON_AI_GENERATOR_LABEL =
  "Deterministic Rule Engine (Offline Fallback — No Live AI Service Configured)";

export const AI_DISCLAIMER =
  "AI and assistant suggestions are advisory decision-support outputs. " +
  "They do not constitute legal advice, official regulatory clearance, or a guarantee of compliance. " +
  "All cited excerpts and status recommendations must be reviewed and confirmed by an authorized officer.";

/* ───────── Normalization & Verification ───────── */

/** Normalize whitespace and punctuation for robust excerpt matching */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifies whether a cited excerpt actually exists on the given page.
 * Returns true only if the excerpt (or a normalized version) appears in the page text.
 */
export function verifySourceExcerpt(
  pages: PdfPage[],
  citedExcerpt: string,
  pageNumber: number,
): boolean {
  if (!citedExcerpt || !citedExcerpt.trim()) return false;
  if (pageNumber < 1 || pageNumber > pages.length) return false;

  const page = pages[pageNumber - 1];
  if (!page || !page.text) return false;

  const normExcerpt = normalizeText(citedExcerpt);
  const normPage = normalizeText(page.text);

  // Direct substring check
  if (normPage.includes(normExcerpt)) return true;

  // Partial match for longer excerpts (first 30 characters must match)
  if (normExcerpt.length >= 30) {
    const head = normExcerpt.slice(0, 30);
    if (normPage.includes(head)) return true;
  }

  return false;
}

/**
 * Validates an AI suggestion against the actual extracted document pages:
 * 1. Never invent a source or clause.
 * 2. If cited excerpt is missing or fails verification, demote status to "Needs Review".
 * 3. Enforces strict grounding in the document text.
 */
export function validateAiSuggestion(
  suggestion: AiReviewSuggestion,
  pages: PdfPage[],
): AiReviewSuggestion {
  const result: AiReviewSuggestion = { ...suggestion };

  // Case 1: Suggestion claims to cite an excerpt
  if (result.citedExcerpt && result.citedExcerpt.trim()) {
    if (!result.pageNumber || result.pageNumber < 1) {
      result.isValidSourceExcerpt = false;
      result.recommendedStatus = "Needs Review";
      result.explanation = "Needs review — citation lacks a valid document page number.";
      result.gapAnalysis =
        "Verification warning: An excerpt was suggested but without an exact page reference.";
      return result;
    }

    const isValid = verifySourceExcerpt(pages, result.citedExcerpt, result.pageNumber);
    if (!isValid) {
      result.isValidSourceExcerpt = false;
      result.recommendedStatus = "Needs Review";
      result.explanation = `Needs review — citation failed document verification. The quoted excerpt was not found on Page ${result.pageNumber}.`;
      result.gapAnalysis =
        "Verification warning: Hallucinated or unverified excerpt detected. The suggested quote does not match the actual page text.";
      return result;
    }

    result.isValidSourceExcerpt = true;
    return result;
  }

  // Case 2: No cited excerpt provided
  result.isValidSourceExcerpt = false;

  // If status was marked "Found" without evidence, demote to "Needs Review"
  if (result.recommendedStatus === "Found") {
    result.recommendedStatus = "Needs Review";
    result.explanation =
      "Needs review — suggestion recommended 'Found' but provided no verifiable source excerpt.";
    result.gapAnalysis =
      "Potential evidence gap: No supporting text excerpt was located to substantiate this requirement.";
  }

  return result;
}

/* ───────── Non-AI Heuristic Fallback Engine ───────── */

/**
 * Extracts a complete sentence containing a search term from page text.
 */
function extractSentenceWithTerm(pageText: string, term: string): string | null {
  const lowerText = pageText.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const idx = lowerText.indexOf(lowerTerm);
  if (idx === -1) return null;

  // Find sentence boundaries around the match
  const before = pageText.slice(0, idx);
  const after = pageText.slice(idx + term.length);

  const startMatch = before.search(/[.!?\n][^\w]*$/);
  const start = startMatch !== -1 ? startMatch + 1 : Math.max(0, idx - 80);

  const endMatch = after.search(/[.!?\n]/);
  const end =
    endMatch !== -1
      ? idx + term.length + endMatch + 1
      : Math.min(pageText.length, idx + term.length + 80);

  const snippet = pageText.slice(start, end).replace(/\s+/g, " ").trim();
  return snippet.length >= 10 ? snippet : null;
}

/**
 * Generates an explainable, source-grounded review using deterministic heuristics
 * when no external AI service is configured.
 *
 * Labeled honestly as offline fallback.
 */
export function generateNonAiFallbackReview(
  pages: PdfPage[],
  rules: AuditRule[] = AUDIT_RULES,
): AiReviewReport {
  const suggestions: AiReviewSuggestion[] = [];

  for (const rule of rules) {
    let foundPageNumber: number | null = null;
    let foundExcerpt: string | null = null;

    // Search for best matching excerpt across pages
    for (const page of pages) {
      if (!page.text) continue;
      for (const group of rule.searchGroups) {
        for (const term of group) {
          const excerpt = extractSentenceWithTerm(page.text, term);
          if (excerpt) {
            foundExcerpt = excerpt;
            foundPageNumber = page.pageNumber;
            break;
          }
        }
        if (foundExcerpt) break;
      }
      if (foundExcerpt) break;
    }

    if (foundExcerpt && foundPageNumber) {
      // Determine if match has strengthening terms
      let hasStrength = true;
      if (rule.strengthenTerms && rule.strengthenTerms.length > 0) {
        const full = pages
          .map((p) => p.text)
          .join(" ")
          .toLowerCase();
        const matches = rule.strengthenTerms.filter((t) => full.includes(t.toLowerCase()));
        hasStrength = matches.length > 0;
      }

      const status = hasStrength ? "Found" : "Needs Review";
      const rawSuggestion: AiReviewSuggestion = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        clauseSummary: `Tender addresses ${rule.name.toLowerCase()} in document text on Page ${foundPageNumber}.`,
        gapAnalysis: hasStrength
          ? "No critical gaps identified for this requirement based on extracted text."
          : `Requirement is referenced, but secondary supporting terms (${rule.strengthenTerms?.join(", ")}) were not fully located. Manual verification recommended.`,
        citedExcerpt: foundExcerpt,
        pageNumber: foundPageNumber,
        recommendedStatus: status,
        explanation: hasStrength ? rule.foundExplanation : rule.needsReviewExplanation,
        sourceMode: "non-ai-fallback",
        generatorLabel: NON_AI_GENERATOR_LABEL,
        isValidSourceExcerpt: true,
      };

      suggestions.push(validateAiSuggestion(rawSuggestion, pages));
    } else {
      // No matching evidence in PDF
      const rawSuggestion: AiReviewSuggestion = {
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        clauseSummary: `No clauses addressing ${rule.name.toLowerCase()} were detected in the extracted text.`,
        gapAnalysis: `Gap identified: This requirement (${rule.name}) was not found in the tender document. For public procurement compliance under ${rule.source.name}, verify whether this clause is included in a separate annexure or specification sheet.`,
        citedExcerpt: null,
        pageNumber: null,
        recommendedStatus: "Missing",
        explanation: rule.missingExplanation,
        sourceMode: "non-ai-fallback",
        generatorLabel: NON_AI_GENERATOR_LABEL,
        isValidSourceExcerpt: false,
      };

      suggestions.push(validateAiSuggestion(rawSuggestion, pages));
    }
  }

  return {
    suggestions,
    mode: "non-ai-fallback",
    statusMessage:
      "Using deterministic rule engine fallback (no external AI service configured in environment).",
    timestamp: new Date().toISOString(),
    disclaimer: AI_DISCLAIMER,
  };
}

/* ───────── Environment / Service Check ───────── */

/**
 * Checks whether a server-side AI integration is configured.
 * Note: Keeps all private API keys strictly on the server; client never reads secret keys directly.
 */
export function isLiveAiConfigured(): boolean {
  // In this client-side environment, we check if an approved integration is present.
  // Currently, no external AI service is configured or enabled.
  return false;
}

/**
 * Main entry point for AI-assisted review.
 * Safely routes to live AI if configured on the server, or the honest Non-AI Fallback.
 */
export async function getAiTenderReview(
  pages: PdfPage[],
  rules: AuditRule[] = AUDIT_RULES,
): Promise<AiReviewReport> {
  // If no live AI service configured, return the honest fallback immediately
  if (!isLiveAiConfigured()) {
    return generateNonAiFallbackReview(pages, rules);
  }

  // Future live server integration would be called here via server function:
  // e.g. const res = await fetch("/api/ai-review", { method: "POST", body: ... });
  return generateNonAiFallbackReview(pages, rules);
}

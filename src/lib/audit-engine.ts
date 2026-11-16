/**
 * Tender audit engine — source-based, explainable rule checker.
 *
 * Takes extracted PDF pages and runs each audit rule against the text,
 * producing structured findings with evidence, page numbers, and
 * confidence indicators.
 *
 * IMPORTANT: Results are DECISION SUPPORT, not legal advice or official
 * clearance. Every finding must be reviewed by a human before it is
 * considered verified.
 */

import type { PdfPage } from "./pdf-extract";
import { AUDIT_RULES, type AuditRule, type RuleSource, type RulePriority } from "./audit-rules";

/* ───────── Types ───────── */

export type FindingStatus = "Found" | "Missing" | "Needs Review" | "Not Applicable";

export type Confidence = "High" | "Medium" | "Low";

export interface EvidenceSnippet {
  /** The matching text excerpt (up to ~200 chars around the match) */
  text: string;
  /** 1-based page number where this evidence was found */
  pageNumber: number;
  /** The specific search term that matched */
  matchedTerm: string;
}

export interface AuditFinding {
  /** Rule ID */
  ruleId: string;
  /** Rule name */
  ruleName: string;
  /** Rule category */
  category: string;
  /** Rule priority for compliance risk */
  priority: RulePriority;
  /** Source document info */
  source: RuleSource;
  /** Result of the check */
  status: FindingStatus;
  /** Plain-language explanation of the result */
  explanation: string;
  /** Evidence excerpts with page numbers (empty if Missing) */
  evidence: EvidenceSnippet[];
  /** How confident the engine is in this result */
  confidence: Confidence;
  /** Whether a human has reviewed and verified this finding */
  humanVerified: boolean;
  /** Officer review remarks / notes */
  officerNotes?: string;
  /** Full rule description for context */
  ruleDescription: string;
}

export interface AuditReport {
  /** All findings from the audit */
  findings: AuditFinding[];
  /** Summary counts */
  counts: Record<FindingStatus, number>;
  /** Overall compliance score (0-100) */
  score: number;
  /** Timestamp of the audit */
  timestamp: string;
  /** Disclaimer text */
  disclaimer: string;
}

/* ───────── Constants ───────── */

const CONTEXT_CHARS = 100; // characters of context around a match
const MAX_EVIDENCE_PER_RULE = 3; // limit evidence snippets per rule

const DISCLAIMER =
  "This audit is automated decision support from an academic prototype. " +
  "It is NOT legal advice, an official clearance, or a substitute for expert review. " +
  "All findings must be verified by a qualified human reviewer before action.";

/* ───────── Engine ───────── */

/**
 * Search for a term in page text (case-insensitive) and extract evidence.
 */
function searchInPages(
  pages: PdfPage[],
  term: string,
): EvidenceSnippet[] {
  const results: EvidenceSnippet[] = [];
  const lowerTerm = term.toLowerCase();

  for (const page of pages) {
    if (!page.text) continue;
    const lowerText = page.text.toLowerCase();
    let startIdx = 0;

    while (startIdx < lowerText.length) {
      const idx = lowerText.indexOf(lowerTerm, startIdx);
      if (idx === -1) break;

      // Extract context around the match
      const contextStart = Math.max(0, idx - CONTEXT_CHARS);
      const contextEnd = Math.min(page.text.length, idx + term.length + CONTEXT_CHARS);
      let snippet = page.text.slice(contextStart, contextEnd).trim();

      // Add ellipsis if truncated
      if (contextStart > 0) snippet = "…" + snippet;
      if (contextEnd < page.text.length) snippet = snippet + "…";

      results.push({
        text: snippet,
        pageNumber: page.pageNumber,
        matchedTerm: term,
      });

      // Move past this match
      startIdx = idx + term.length;

      // Limit per-page matches to avoid flooding
      if (results.length >= MAX_EVIDENCE_PER_RULE * 2) break;
    }

    if (results.length >= MAX_EVIDENCE_PER_RULE * 2) break;
  }

  return results;
}

/**
 * Check whether a search group matches — ALL terms in the group must be
 * found somewhere in the text (case-insensitive).
 */
function groupMatches(pages: PdfPage[], group: string[]): boolean {
  const fullText = pages
    .map((p) => p.text)
    .join(" ")
    .toLowerCase();

  return group.every((term) => fullText.includes(term.toLowerCase()));
}

/**
 * Run a single rule against the extracted pages.
 */
function evaluateRule(rule: AuditRule, pages: PdfPage[]): AuditFinding {
  // Check if any search group fully matches
  let matched = false;
  let matchedGroupIdx = -1;

  for (let i = 0; i < rule.searchGroups.length; i++) {
    if (groupMatches(pages, rule.searchGroups[i]!)) {
      matched = true;
      matchedGroupIdx = i;
      break;
    }
  }

  if (!matched) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      priority: rule.priority,
      source: rule.source,
      status: "Missing",
      explanation: rule.missingExplanation,
      evidence: [],
      confidence: "Medium",
      humanVerified: false,
      officerNotes: "",
      ruleDescription: rule.description,
    };
  }

  // Collect evidence from the matched group's terms
  const matchedGroup = rule.searchGroups[matchedGroupIdx]!;
  const allEvidence: EvidenceSnippet[] = [];

  for (const term of matchedGroup) {
    const snippets = searchInPages(pages, term);
    allEvidence.push(...snippets);
  }

  // Deduplicate by page + rough position
  const seen = new Set<string>();
  const uniqueEvidence = allEvidence.filter((e) => {
    const key = `${e.pageNumber}:${e.text.slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Limit evidence count
  const evidence = uniqueEvidence.slice(0, MAX_EVIDENCE_PER_RULE);

  // Check strengthen terms to determine confidence and final status
  let hasStrengthenMatch = true;
  let confidence: Confidence = "Medium";

  if (rule.strengthenTerms && rule.strengthenTerms.length > 0) {
    const fullText = pages
      .map((p) => p.text)
      .join(" ")
      .toLowerCase();

    const strengthMatched = rule.strengthenTerms.filter((t) =>
      fullText.includes(t.toLowerCase()),
    );

    if (strengthMatched.length === 0) {
      // Primary found but no strengthening terms — "Needs Review"
      hasStrengthenMatch = false;
      confidence = "Low";
    } else if (strengthMatched.length >= Math.ceil(rule.strengthenTerms.length / 2)) {
      confidence = "High";
    } else {
      confidence = "Medium";
    }
  } else {
    // No strengthen terms defined — confidence based on evidence count
    confidence = evidence.length >= 2 ? "High" : "Medium";
  }

  if (!hasStrengthenMatch) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      priority: rule.priority,
      source: rule.source,
      status: "Needs Review",
      explanation: rule.needsReviewExplanation,
      evidence,
      confidence,
      humanVerified: false,
      officerNotes: "",
      ruleDescription: rule.description,
    };
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    priority: rule.priority,
    source: rule.source,
    status: "Found",
    explanation: rule.foundExplanation,
    evidence,
    confidence,
    humanVerified: false,
    officerNotes: "",
    ruleDescription: rule.description,
  };
}

/**
 * Strips sample/demo test notes such as "Items Deliberately Omitted"
 * so that explanatory notes listing omitted items are not falsely detected as evidence.
 */
function cleanPagesForAudit(pages: PdfPage[]): PdfPage[] {
  return pages.map((page) => {
    let text = page.text;
    const omitPattern = /(?:items\s+deliberately\s+omitted|deliberate\s+omissions\s+for\s+testing)/i;
    const match = text.search(omitPattern);
    if (match !== -1) {
      text = text.slice(0, match).trim();
    }
    return { ...page, text };
  });
}

/**
 * Run all audit rules against extracted PDF pages.
 *
 * Returns a complete audit report with findings, counts, and score.
 * All findings start with humanVerified = false.
 */
export function runAudit(pages: PdfPage[]): AuditReport {
  const cleanedPages = cleanPagesForAudit(pages);
  const findings = AUDIT_RULES.map((rule) => evaluateRule(rule, cleanedPages));

  const counts: Record<FindingStatus, number> = {
    Found: 0,
    Missing: 0,
    "Needs Review": 0,
    "Not Applicable": 0,
  };
  for (const f of findings) {
    counts[f.status]++;
  }

  const applicable = findings.filter((f) => f.status !== "Not Applicable");
  const score =
    applicable.length === 0
      ? 0
      : Math.round(
          (applicable.reduce((sum, f) => {
            if (f.status === "Found") return sum + 1;
            if (f.status === "Needs Review") return sum + 0.5;
            return sum;
          }, 0) /
            applicable.length) *
            100,
        );

  return {
    findings,
    counts,
    score,
    timestamp: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/**
 * Re-export for convenience.
 */
export { AUDIT_RULES } from "./audit-rules";
export type { AuditRule, RuleSource, RuleSourceType, RulePriority } from "./audit-rules";

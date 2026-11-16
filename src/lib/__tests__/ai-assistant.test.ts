/**
 * Tests for the AI-assisted tender review module and strict citation validation.
 *
 * Run with: npx tsx src/lib/__tests__/ai-assistant.test.ts
 */

import {
  generateNonAiFallbackReview,
  validateAiSuggestion,
  verifySourceExcerpt,
  type AiReviewSuggestion,
  NON_AI_GENERATOR_LABEL,
} from "../ai-assistant";
import type { PdfPage } from "../pdf-extract";
import { AUDIT_RULES } from "../audit-rules";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

/* ───────── Sample Data ───────── */

const SAMPLE_PAGES: PdfPage[] = [
  {
    pageNumber: 1,
    text: "Tender Notice: Procurement of Smart Classroom Equipment. Total budget allocation is INR 3,50,00,000 inclusive of taxes. Payment schedule: 30% advance on contract signing. Each bidder must submit a bid security of INR 7,00,000 as bank guarantee.",
  },
  {
    pageNumber: 2,
    text: "Delivery timeline is 90 calendar days from work order. QCBS evaluation criteria: 70% technical score and 30% financial score.",
  },
];

console.log("\n=== Test Suite 1: Honest Non-AI Fallback Labeling ===\n");

const report = generateNonAiFallbackReview(SAMPLE_PAGES);

assert(report.mode === "non-ai-fallback", "Mode is explicitly 'non-ai-fallback'");
assert(
  report.statusMessage.toLowerCase().includes("fallback") ||
    report.statusMessage.toLowerCase().includes("no external ai"),
  "Status message honestly states fallback mode",
);
assert(
  report.suggestions.every((s) => s.generatorLabel === NON_AI_GENERATOR_LABEL),
  "All suggestions are stamped with honest generator label",
);
assert(
  report.suggestions.every((s) => s.sourceMode === "non-ai-fallback"),
  "All suggestions carry sourceMode = 'non-ai-fallback'",
);

console.log("\n=== Test Suite 2: Document with Matching Evidence ===\n");

const budgetSuggestion = report.suggestions.find((s) => s.ruleId === "BUDGET_ALLOCATION");

assert(budgetSuggestion !== undefined, "Budget suggestion generated");
assert(budgetSuggestion?.recommendedStatus === "Found", "Budget status is 'Found'");
assert(budgetSuggestion?.pageNumber === 1, "Budget evidence points to Page 1");
assert(
  (budgetSuggestion?.citedExcerpt?.length ?? 0) > 0,
  "Budget suggestion includes cited excerpt",
);
assert(
  budgetSuggestion?.isValidSourceExcerpt === true,
  "Budget excerpt is validated against document text",
);
assert(
  (budgetSuggestion?.gapAnalysis.length ?? 0) > 0,
  "Gap analysis is present for matching clause",
);

console.log("\n=== Test Suite 3: Document with NO Matching Evidence ===\n");

// Environmental compliance is completely absent in SAMPLE_PAGES
const envSuggestion = report.suggestions.find((s) => s.ruleId === "ENVIRONMENTAL_COMPLIANCE");

assert(envSuggestion !== undefined, "Environmental suggestion generated");
assert(
  envSuggestion?.recommendedStatus === "Missing",
  "Status is 'Missing' when evidence is absent",
);
assert(
  envSuggestion?.citedExcerpt === null,
  "No cited excerpt is invented when evidence is absent",
);
assert(
  envSuggestion?.pageNumber === null,
  "Page number is null when evidence is absent",
);
assert(
  envSuggestion?.isValidSourceExcerpt === false,
  "isValidSourceExcerpt is false for missing evidence",
);
assert(
  Boolean(
    envSuggestion?.gapAnalysis.toLowerCase().includes("gap") ||
      envSuggestion?.gapAnalysis.toLowerCase().includes("not found"),
  ),
  "Gap analysis clearly explains the missing clause risk",
);

// Completely empty page test
const emptyReport = generateNonAiFallbackReview([{ pageNumber: 1, text: "" }]);
assert(
  emptyReport.suggestions.every((s) => s.recommendedStatus === "Missing"),
  "All suggestions are 'Missing' for empty document",
);
assert(
  emptyReport.suggestions.every((s) => s.citedExcerpt === null),
  "Zero excerpts invented for empty document",
);

console.log("\n=== Test Suite 4: AI Suggestion Lacks Valid Source Excerpt (Hallucination Test) ===\n");

// Scenario A: AI invents a quote that does NOT exist on the page
const hallucinatedSuggestion: AiReviewSuggestion = {
  ruleId: "ENVIRONMENTAL_COMPLIANCE",
  ruleName: "Environmental Clause",
  category: "Compliance",
  clauseSummary: "Vendor shall plant 500 indigenous trees across the municipal ward.",
  gapAnalysis: "None.",
  citedExcerpt: "Vendor shall plant 500 indigenous trees across the municipal ward.",
  pageNumber: 1, // Page 1 actually discusses classroom equipment!
  recommendedStatus: "Found",
  explanation: "Environmental clause found on Page 1.",
  sourceMode: "live-ai",
  generatorLabel: "Simulated Model",
  isValidSourceExcerpt: true, // Claims to be valid
};

const validatedHallucination = validateAiSuggestion(hallucinatedSuggestion, SAMPLE_PAGES);

assert(
  validatedHallucination.isValidSourceExcerpt === false,
  "Validator flags hallucinated excerpt as invalid (isValidSourceExcerpt: false)",
);
assert(
  validatedHallucination.recommendedStatus === "Needs Review",
  "Status is demoted from 'Found' to 'Needs Review' when excerpt is unverified",
);
assert(
  validatedHallucination.explanation.toLowerCase().includes("failed") ||
    validatedHallucination.explanation.toLowerCase().includes("not found"),
  "Explanation clearly informs user that citation failed document verification",
);
assert(
  validatedHallucination.gapAnalysis.toLowerCase().includes("warning") ||
    validatedHallucination.gapAnalysis.toLowerCase().includes("unverified"),
  "Gap analysis warns of unverified or hallucinated excerpt",
);

// Scenario B: AI provides excerpt but invalid page number (page out of bounds)
const outOfBoundsSuggestion: AiReviewSuggestion = {
  ruleId: "DELIVERY_TIMELINE",
  ruleName: "Delivery Timeline",
  category: "Timeline",
  clauseSummary: "Delivery timeline 90 days.",
  gapAnalysis: "None.",
  citedExcerpt: "Delivery timeline is 90 calendar days",
  pageNumber: 99, // PDF only has 2 pages
  recommendedStatus: "Found",
  explanation: "Found on Page 99.",
  sourceMode: "live-ai",
  generatorLabel: "Simulated Model",
  isValidSourceExcerpt: true,
};

const validatedOutOfBounds = validateAiSuggestion(outOfBoundsSuggestion, SAMPLE_PAGES);
assert(
  validatedOutOfBounds.isValidSourceExcerpt === false,
  "Out of bounds page number is rejected",
);
assert(
  validatedOutOfBounds.recommendedStatus === "Needs Review",
  "Out of bounds citation demoted to 'Needs Review'",
);

// Scenario C: AI marks "Found" but provides null excerpt
const missingExcerptSuggestion: AiReviewSuggestion = {
  ruleId: "TECHNICAL_SPECS",
  ruleName: "Technical Specs",
  category: "Technical",
  clauseSummary: "Specifications are present.",
  gapAnalysis: "None.",
  citedExcerpt: null, // No evidence provided
  pageNumber: null,
  recommendedStatus: "Found",
  explanation: "Found without evidence.",
  sourceMode: "live-ai",
  generatorLabel: "Simulated Model",
  isValidSourceExcerpt: false,
};

const validatedMissingExcerpt = validateAiSuggestion(missingExcerptSuggestion, SAMPLE_PAGES);
assert(
  validatedMissingExcerpt.recommendedStatus === "Needs Review",
  "'Found' without supporting excerpt is demoted to 'Needs Review'",
);
assert(
  validatedMissingExcerpt.explanation.toLowerCase().includes("lacks") ||
    validatedMissingExcerpt.explanation.toLowerCase().includes("no verifiable"),
  "Explanation notes lack of source excerpt",
);

console.log("\n=== Test Suite 5: Exact Text and Page Citing ===\n");

// Verify source excerpt helper directly
const exactQuote = "Total budget allocation is INR 3,50,00,000 inclusive of taxes.";
assert(
  verifySourceExcerpt(SAMPLE_PAGES, exactQuote, 1) === true,
  "verifySourceExcerpt verifies exact match on correct page",
);
assert(
  verifySourceExcerpt(SAMPLE_PAGES, exactQuote, 2) === false,
  "verifySourceExcerpt rejects match on wrong page",
);
assert(
  verifySourceExcerpt(SAMPLE_PAGES, "Non-existent fictional clause text", 1) === false,
  "verifySourceExcerpt rejects fictional quote",
);

console.log("\n\n=== RESULTS ===\n");
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed!`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${passed} tests passed!`);
}

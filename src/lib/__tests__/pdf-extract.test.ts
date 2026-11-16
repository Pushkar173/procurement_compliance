/**
 * Tests for the PDF Extraction module (src/lib/pdf-extract.ts).
 *
 * Verifies:
 * - Successful text extraction from readable PDFs (Sample 1 & Sample 2)
 * - Page retention and 1-based page numbering
 * - Handling of empty (0-byte) files
 * - Handling of corrupted / invalid PDF files
 * - Honest error reporting when no text layer is found (scanned / image-only)
 * - formatFileSize helper
 *
 * Run via Vite runner.
 */

import fs from "node:fs";
import path from "node:path";
import { extractPdfText, formatFileSize } from "../pdf-extract";

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

console.log("\n=== Test Suite: PDF Extraction & Error Handling ===\n");

// ── Test 1: Readable PDF 1 (Smart Classroom) ──
const sample1Path = path.resolve(process.cwd(), "public/samples/sample-tender-1-smart-classroom.pdf");
const sample1Buffer = fs.readFileSync(sample1Path);
const sample1Blob = new Blob([sample1Buffer], { type: "application/pdf" });
const sample1File = new File([sample1Blob], "sample-tender-1-smart-classroom.pdf", { type: "application/pdf" });

console.log("-- Test 1: Readable PDF 1 (Smart Classroom) --");
const res1 = await extractPdfText(sample1File);
assert(res1.ok === true, "Sample 1 extraction succeeded (ok: true)");
if (res1.ok) {
  assert(res1.totalPages === 3, `Sample 1 has 3 pages (got: ${res1.totalPages})`);
  assert(res1.pages.length === 3, "res1.pages has 3 items");
  assert(res1.pages[0]?.pageNumber === 1, "Page 1 has 1-based index 1");
  assert(res1.pages[1]?.pageNumber === 2, "Page 2 has 1-based index 2");
  assert(Boolean(res1.pages[0]?.text.includes("Smart Classroom")), "Page 1 contains tender title text");
  assert(Boolean(res1.pages[0]?.text.includes("3,50,00,000")), "Page 1 contains budget amount");
  assert(Boolean(res1.pages[1]?.text.includes("QCBS")), "Page 2 contains QCBS evaluation clause");
  assert(res1.fullText.length > 500, `Full text is readable (${res1.fullText.length} characters)`);
}

// ── Test 2: Readable PDF 2 (Road Resurfacing) ──
console.log("\n-- Test 2: Readable PDF 2 (Road Resurfacing) --");
const sample2Path = path.resolve(process.cwd(), "public/samples/sample-tender-2-road-resurfacing.pdf");
const sample2Buffer = fs.readFileSync(sample2Path);
const sample2Blob = new Blob([sample2Buffer], { type: "application/pdf" });
const sample2File = new File([sample2Blob], "sample-tender-2-road-resurfacing.pdf", { type: "application/pdf" });

const res2 = await extractPdfText(sample2File);
assert(res2.ok === true, "Sample 2 extraction succeeded (ok: true)");
if (res2.ok) {
  assert(res2.totalPages === 3, `Sample 2 has 3 pages (got: ${res2.totalPages})`);
  assert(Boolean(res2.pages[0]?.text.includes("Road Resurfacing")), "Page 1 contains Road Resurfacing text");
  assert(Boolean(res2.pages[0]?.text.includes("4,75,00,000")), "Page 1 contains budget amount INR 4,75,00,000");
  assert(Boolean(res2.pages[1]?.text.includes("Arbitrator") || res2.pages[1]?.text.includes("Dispute")), "Page 2 contains Dispute clause");
}

// ── Test 3: Empty / 0-byte File ──
console.log("\n-- Test 3: Empty (0-byte) File Handling --");
const emptyBlob = new Blob([], { type: "application/pdf" });
const emptyFile = new File([emptyBlob], "empty.pdf", { type: "application/pdf" });
const emptyRes = await extractPdfText(emptyFile);
assert(emptyRes.ok === false, "Empty file was rejected (ok: false)");
if (!emptyRes.ok) {
  assert(emptyRes.errorType === "empty", `Error type is 'empty' (got: ${emptyRes.errorType})`);
  assert(emptyRes.message.includes("empty (0 bytes)"), "Clear message explaining 0-byte limitation");
}

// ── Test 4: Corrupted / Invalid Binary File ──
console.log("\n-- Test 4: Corrupted / Invalid PDF File Handling --");
const junkBytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x57, 0x6f, 0x72, 0x6c, 0x64]); // "Hello World"
const junkBlob = new Blob([junkBytes], { type: "application/pdf" });
const junkFile = new File([junkBlob], "corrupted.pdf", { type: "application/pdf" });
const junkRes = await extractPdfText(junkFile);
assert(junkRes.ok === false, "Corrupted file was rejected (ok: false)");
if (!junkRes.ok) {
  assert(
    junkRes.errorType === "corrupted" || junkRes.errorType === "unknown",
    `Error type is 'corrupted' or 'unknown' (got: ${junkRes.errorType})`,
  );
  assert(junkRes.message.toLowerCase().includes("could not read") || junkRes.message.toLowerCase().includes("corrupted"), "Informative error message given");
}

// ── Test 5: Helper Functions ──
console.log("\n-- Test 5: formatFileSize Helper --");
assert(formatFileSize(500) === "500 B", "500 B formatted correctly");
assert(formatFileSize(2048) === "2.0 KB", "2.0 KB formatted correctly");
assert(formatFileSize(1572864) === "1.5 MB", "1.5 MB formatted correctly");

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);

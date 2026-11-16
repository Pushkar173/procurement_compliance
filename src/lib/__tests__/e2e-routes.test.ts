/**
 * End-to-end HTTP verification for all routes, public assets, and demo materials on the running server.
 *
 * Tests:
 * - Public sample PDFs accessible via HTTP
 * - Core application routes accessible via HTTP
 * - Role-based pages and layouts
 *
 * Run with: node src/lib/__tests__/e2e-routes.test.ts
 */

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

const BASE_URL = "http://localhost:8080";

console.log("\n=== Test Suite: End-to-End Route & Asset Availability ===\n");

// ── 1. Static PDF Assets ──
const SAMPLES = [
  "sample-tender-1-smart-classroom.pdf",
  "sample-tender-2-road-resurfacing.pdf",
  "how-tender-audit-works.pdf",
  "viva-demo-guide.pdf",
];

async function run() {
  for (const s of SAMPLES) {
    const url = `${BASE_URL}/samples/${s}`;
    try {
      const res = await fetch(url);
      assert(res.status === 200, `Asset ${s} returns HTTP 200`);
      const cType = res.headers.get("content-type") || "";
      assert(
        cType.includes("pdf") || cType.includes("octet-stream"),
        `Asset ${s} has valid PDF MIME type (${cType})`,
      );
      const buf = await res.arrayBuffer();
      assert(
        buf.byteLength > 1000,
        `Asset ${s} has non-trivial file size (${buf.byteLength} bytes)`,
      );
    } catch (err) {
      assert(false, `Failed to fetch ${url}: ${err}`);
    }
  }

  // ── 2. Core Application Routes ──
  const ROUTES = [
    { path: "/", title: "Root Page" },
    { path: "/audit-tender", title: "Audit Tender Workflow" },
    { path: "/dashboard", title: "Dashboard Overview" },
    { path: "/tenders", title: "Tenders List" },
    { path: "/documents", title: "Regulation Documents Registry" },
    { path: "/contracts", title: "Contracts Register" },
    { path: "/reports", title: "Reports & Metrics" },
    { path: "/admin", title: "Admin Portal" },
  ];

  for (const r of ROUTES) {
    const url = `${BASE_URL}${r.path}`;
    try {
      const res = await fetch(url);
      assert(res.status === 200, `Route ${r.path} (${r.title}) returns HTTP 200`);
      const html = await res.text();
      assert(
        html.includes("<!DOCTYPE html>") || html.includes("<html"),
        `Route ${r.path} returns valid HTML document`,
      );
      assert(
        html.includes("ProcureComply") || html.includes("vite"),
        `Route ${r.path} contains application shell`,
      );
    } catch (err) {
      assert(false, `Failed to fetch ${url}: ${err}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

run();

export {};

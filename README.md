# ProcureComply — Public Procurement Compliance & Audit Platform

ProcureComply is a public procurement compliance and automated tender audit platform. It provides source-based, explainable rule checking against procurement regulations, decision-support tender analysis, and exportable audit reports.

> **Decision Support Only:** Automated rule checking and AI-assisted summaries provide decision support and do not constitute legal advice or an official regulatory clearance. All findings, page evidence, and missing clauses require review and verification by a qualified procurement officer.

---

## Key Features

1. **Explainable Tender Audit Engine**:
   - 18 comprehensive rules covering GFR 2017, CVC Guidelines, and Manual for Procurement.
   - Deterministic keyword and clause matching with exact page-level evidence citations.
   - Categorized findings: *Found*, *Missing*, *Needs Review*, or *Not Applicable*.
   - Explainable scoring based on verified coverage of applicable requirements.

2. **In-Browser PDF Text Extraction**:
   - Client-side text parsing using `pdfjs-dist` legacy build.
   - Zero file transmission — documents remain completely secure and private within the browser.
   - Extracts page-by-page text, character metrics, and detects scanned/image-only pages.

3. **Anti-Hallucination AI Assistant with Fallback**:
   - Strict citation grounding validator verifying that every quoted excerpt exists on the cited page.
   - Automated demotion to "Needs Review" when evidence is weak or ungrounded.
   - Honest labeling of live AI suggestions vs. deterministic non-AI fallback heuristics.

4. **Interactive 5-Step Audit Workflow**:
   - **Step 1 — Upload Document**: Drop or pick a PDF, or run one of the included demo tenders.
   - **Step 2 — Review Extracted Details**: Review pre-filled metadata and view page text.
   - **Step 3 — Run Compliance Checks**: Real-time progress bar checking against procurement rules.
   - **Step 4 — Review Findings**: Detailed findings grouped by priority, evidence excerpts, officer notes, and verification toggles.
   - **Step 5 — Generate Audit Report**: Downloadable client-side PDF report labeled *"Automated review — human verification required"*.

5. **Role-Based Procurement Shell**:
   - Officer, Auditor, and Admin portals.
   - Tenders directory, Contract register, Compliance monitoring, and Regulation document repository.

---

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Installation & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) to access the application.

### Build & Verification

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build

# Preview build
npm run preview
```

### Running Test Suites

```bash
# Run all unit and E2E test suites (161 tests)
node src/lib/__tests__/audit-engine.test.ts
node src/lib/__tests__/pdf-extract.test.ts
node src/lib/__tests__/ai-assistant.test.ts
node src/lib/__tests__/pdf-report.test.ts
node src/lib/__tests__/e2e-routes.test.ts
```

---

## Tech Stack

- **Framework**: TanStack Start (React 19, TypeScript)
- **Styling**: Tailwind CSS
- **PDF Engine**: `pdfjs-dist` (In-browser parsing), `jspdf` (Report generation)
- **UI Components**: Radix UI primitives, Lucide icons, Sonner toast notifications

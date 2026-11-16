import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  Filter,
  Loader2,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  Field,
  inputClass,
  PageHeader,
  Panel,
  ProgressBar,
  textareaClass,
} from "@/components/common/primitives";
import { DEPARTMENTS, type Tender } from "@/data/demoData";
import {
  getAiTenderReview,
  type AiReviewReport,
  type AiReviewSuggestion,
} from "@/lib/ai-assistant";
import {
  runAudit,
  AUDIT_RULES,
  type AuditFinding,
  type FindingStatus,
  type Confidence,
  type EvidenceSnippet,
  type RuleSource,
} from "@/lib/audit-engine";
import type { RulePriority } from "@/lib/audit-rules";
import {
  extractPdfText,
  formatFileSize,
  type PdfExtractionResult,
  type PdfExtractionError,
} from "@/lib/pdf-extract";
import { downloadAuditReportPdf } from "@/lib/pdf-report";
import { formatINR, useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/audit-tender")({
  head: () => ({
    meta: [
      { title: "Audit a Tender — ProcureComply" },
      {
        name: "description",
        content:
          "Upload a tender document, review extracted details, run compliance checks, review findings and generate a report.",
      },
    ],
  }),
  component: AuditTenderPage,
});

/* ───────── constants ───────── */

const STEP_LABELS = [
  "Upload Document",
  "Review Details",
  "Run Checks",
  "Review Findings",
  "Generate Report",
];

const FINDING_STATUSES = ["Found", "Missing", "Needs Review", "Not Applicable"] as const;

const FINDING_META: Record<
  FindingStatus,
  { tone: "success" | "danger" | "warning" | "neutral"; icon: typeof Check; explanation: string }
> = {
  Found: {
    tone: "success",
    icon: CheckCircle2,
    explanation: "This requirement appears to be addressed in the tender document.",
  },
  Missing: {
    tone: "danger",
    icon: XCircle,
    explanation: "This requirement was not found in the tender document. Action needed.",
  },
  "Needs Review": {
    tone: "warning",
    icon: TriangleAlert,
    explanation: "Could not determine automatically or details are incomplete. Manual review recommended.",
  },
  "Not Applicable": {
    tone: "neutral",
    icon: FileText,
    explanation: "This rule does not apply to this tender or procurement type.",
  },
};

const SAMPLE_PDFS = [
  {
    href: "/samples/sample-tender-1-smart-classroom.pdf",
    title: "Sample Tender 1 — Smart Classroom Equipment",
    description: "Budget, eligibility & specs present. Missing: environmental, accessibility, penalty clauses.",
  },
  {
    href: "/samples/sample-tender-2-road-resurfacing.pdf",
    title: "Sample Tender 2 — Municipal Road Resurfacing",
    description: "Scope, penalty & dispute clauses present. Missing: safety, insurance, subcontracting.",
  },
  {
    href: "/samples/how-tender-audit-works.pdf",
    title: "How the Tender Audit Works",
    description: "Step-by-step explainer of the five-stage audit workflow and its limitations.",
  },
  {
    href: "/samples/viva-demo-guide.pdf",
    title: "Viva & Demo Guide",
    description: "Suggested walkthrough, expected findings for each sample, and project limitations.",
  },
];

/* ───────── page component ───────── */

function AuditTenderPage() {
  const { documents, addTender, addCompliance, user } = useStore();
  const navigate = useNavigate();
  const role = user?.role;
  const fileRef = useRef<HTMLInputElement>(null);

  /* state */
  const [step, setStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pdfResult, setPdfResult] = useState<PdfExtractionResult | null>(null);
  const [pdfError, setPdfError] = useState<PdfExtractionError | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);

  const [form, setForm] = useState({
    title: "",
    department: "",
    type: "Open Tender (Goods)",
    value: "",
    issueDate: "",
    closingDate: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [checking, setChecking] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [checksComplete, setChecksComplete] = useState(false);

  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [aiReport, setAiReport] = useState<AiReviewReport | null>(null);

  /* derived */
  const activeDocs = useMemo(
    () => documents.filter((d) => d.status === "Active"),
    [documents],
  );

  const matchedDocs = useMemo(
    () =>
      activeDocs.filter(
        (d) =>
          d.stages.some((s) =>
            ["Planning", "Tender Preparation", "Tender Publication", "Evaluation", "Award"].includes(s),
          ),
      ),
    [activeDocs],
  );

  const findingCounts = useMemo(() => {
    const c: Record<FindingStatus, number> = {
      Found: 0,
      Missing: 0,
      "Needs Review": 0,
      "Not Applicable": 0,
    };
    findings.forEach((f) => {
      if (c[f.status] !== undefined) c[f.status] += 1;
    });
    return c;
  }, [findings]);

  const verifiedCount = useMemo(() => {
    return findings.filter((f) => f.humanVerified).length;
  }, [findings]);

  const overallScore = useMemo(() => {
    const applicable = findings.filter((f) => f.status !== "Not Applicable");
    if (applicable.length === 0) return 0;
    const score = applicable.reduce((sum, f) => {
      if (f.status === "Found") return sum + 1;
      if (f.status === "Needs Review") return sum + 0.5;
      return sum;
    }, 0);
    return Math.round((score / applicable.length) * 100);
  }, [findings]);

  const SCORE_EXPLANATION =
    "Calculated as (Found items [1.0] + Needs Review items [0.5]) / Total Applicable Rules * 100. Measures clause coverage against checked rules in extracted text, not statutory legal compliance.";

  const reviewStatusInfo = useMemo(() => {
    const highMissing = findings.filter((f) => f.priority === "High" && f.status === "Missing");
    const unverified = findings.filter((f) => !f.humanVerified);
    const needsReview = findings.filter((f) => f.status === "Needs Review");

    if (highMissing.length > 0) {
      return {
        label: "Action Required — Critical Gaps",
        tone: "danger" as const,
        description: `${highMissing.length} critical high-priority rule${highMissing.length > 1 ? "s are" : " is"} missing from the tender document.`,
      };
    }
    if (needsReview.length > 0 || unverified.length > 0) {
      return {
        label: "Under Review — Human Verification Required",
        tone: "warning" as const,
        description: `${unverified.length} finding${unverified.length > 1 ? "s require" : " requires"} officer review and confirmation.`,
      };
    }
    return {
      label: "Preliminary Review Satisfactory",
      tone: "success" as const,
      description: "All checked requirements identified in text and marked verified by officer.",
    };
  }, [findings]);

  /* helpers */
  const set = <K extends keyof typeof form>(key: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const runExtraction = useCallback(
    async (file: File) => {
      setExtracting(true);
      setPdfError(null);
      setPdfResult(null);
      setShowExtractedText(false);

      const result = await extractPdfText(file);

      if (!result.ok) {
        setExtracting(false);
        setPdfError(result);
        toast.error("PDF extraction failed", { description: result.message });
        return;
      }

      setPdfResult(result);

      // Pre-fill form from extracted info + filename
      const nameWithoutExt = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ");
      setForm({
        title: result.info.title || nameWithoutExt || "Untitled Tender",
        department: DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)] ?? "Information Technology",
        type: "Open Tender (Goods)",
        value: String(Math.floor(Math.random() * 90 + 10) * 100000),
        issueDate: new Date().toISOString().slice(0, 10),
        closingDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        description: `Procurement tender extracted from ${file.name} (${result.totalPages} pages, ${formatFileSize(result.fileSize)}). Review and edit the details below before running compliance checks.`,
      });

      setExtracting(false);
      setStep(1);

      const warnings: string[] = [];
      if (result.emptyPageNumbers.length > 0) {
        warnings.push(
          `${result.emptyPageNumbers.length} of ${result.totalPages} pages had no extractable text (possibly scanned/image pages).`
        );
      }
      toast.success(
        `Text extracted from ${result.totalPages} page${result.totalPages === 1 ? "" : "s"}`,
        {
          description: warnings.length > 0
            ? warnings.join(" ")
            : "Review the details and extracted text below.",
        },
      );
    },
    [],
  );

  const loadSamplePdf = useCallback(
    async (href: string) => {
      try {
        setExtracting(true);
        setPdfError(null);
        setPdfResult(null);
        const res = await fetch(href);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch sample file`);
        const blob = await res.blob();
        const filename = href.split("/").pop() || "sample.pdf";
        const file = new File([blob], filename, { type: "application/pdf" });
        setUploadedFile(file);
        await runExtraction(file);
      } catch (err) {
        setExtracting(false);
        toast.error("Failed to load sample PDF", {
          description: err instanceof Error ? err.message : "Could not load file",
        });
      }
    },
    [runExtraction],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0]!;
      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        toast.error("Only PDF files are accepted");
        return;
      }
      setUploadedFile(file);
      setPdfError(null);
      runExtraction(file);
    },
    [runExtraction],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const isStep1Valid = useCallback(() => {
    if (!form.title.trim()) return false;
    if (!form.department) return false;
    if (!form.value.trim() || Number.isNaN(Number(form.value)) || Number(form.value) <= 0) return false;
    if (!form.description.trim() || form.description.trim().length < 10) return false;
    return true;
  }, [form.title, form.department, form.value, form.description]);

  const validateStep1 = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Tender title is required.";
    if (!form.department) e.department = "Select a department.";
    if (!form.value.trim()) e.value = "Estimated value is required.";
    else if (Number.isNaN(Number(form.value)) || Number(form.value) <= 0) e.value = "Enter a positive number.";
    if (!form.description.trim() || form.description.trim().length < 10)
      e.description = "Provide a brief description (at least 10 characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form.title, form.department, form.value, form.description]);

  const runChecks = useCallback(() => {
    setChecking(true);
    setCheckProgress(0);
    let progress = 0;
    const interval = setInterval(async () => {
      progress += Math.random() * 20 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        // Run real source-based rule checking against extracted PDF pages
        const pages = pdfResult?.pages ?? [
          { pageNumber: 1, text: `${form.title} ${form.description}` },
        ];
        const report = runAudit(pages);
        const aiReview = await getAiTenderReview(pages);

        setFindings(report.findings);
        setAiReport(aiReview);
        setChecking(false);
        setChecksComplete(true);
        toast.success("Compliance checks complete", {
          description: `${report.findings.length} rules checked with explainable citations.`,
        });
      }
      setCheckProgress(Math.min(100, Math.round(progress)));
    }, 80);
  }, [pdfResult, form.title, form.description]);

  const updateFinding = (index: number, status: FindingStatus) => {
    setFindings((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status, humanVerified: true } : f,
      ),
    );
  };

  const updateOfficerNote = (index: number, note: string) => {
    setFindings((prev) =>
      prev.map((f, i) => (i === index ? { ...f, officerNotes: note } : f)),
    );
  };

  const toggleVerifyFinding = (index: number) => {
    setFindings((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, humanVerified: !f.humanVerified } : f,
      ),
    );
  };

  const verifyAllFindings = () => {
    setFindings((prev) => prev.map((f) => ({ ...f, humanVerified: true })));
    toast.success("All findings marked as verified by human reviewer");
  };

  const saveAndCreate = () => {
    const tenderId = `TDR-2026-${Math.floor(Math.random() * 900) + 100}`;
    const toDisplayDate = (iso: string) =>
      iso
        ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

    const tender: Tender = {
      id: tenderId,
      title: form.title.trim(),
      department: form.department,
      type: form.type,
      value: Number(form.value),
      issueDate: toDisplayDate(form.issueDate),
      closingDate: toDisplayDate(form.closingDate),
      evaluationDate: "",
      status: "Draft",
      officer: user?.name ?? "Procurement Officer",
      description: form.description.trim(),
      regulationIds: matchedDocs.map((d) => d.id),
      documents: uploadedFile ? [{ name: uploadedFile.name, date: toDisplayDate(form.issueDate), by: user?.name ?? "Officer" }] : [],
      stage: "Tender Preparation",
    };

    addTender(tender);

    findings.forEach((f) => {
      const complianceStatus =
        f.status === "Found" ? "Compliant" as const :
        f.status === "Missing" ? "Non-Compliant" as const :
        f.status === "Not Applicable" ? "Not Applicable" as const :
        "Pending" as const;
      addCompliance({
        requirement: f.ruleName,
        sourceDocId: f.source.name,
        applicable: f.status !== "Not Applicable",
        includedInTender: f.status === "Found",
        evidence: f.evidence[0] ? `Page ${f.evidence[0].pageNumber}: ${f.evidence[0].text.slice(0, 100)}` : "",
        status: complianceStatus,
        remarks: `${f.explanation} (Confidence: ${f.confidence}${f.humanVerified ? ", Verified by reviewer" : ""})`,
        responsible: user?.name ?? "Procurement Officer",
        dueDate: tender.closingDate,
        completionDate: f.status === "Found" ? tender.issueDate : "",
        tenderId,
        category: f.category,
      });
    });

    toast.success(`Tender ${tenderId} created`, {
      description: `${findings.length} compliance requirements saved with audit findings.`,
    });

    navigate({ to: "/tenders/$tenderId", params: { tenderId } });
  };

  /* navigation */
  const canGoNext = () => {
    if (step === 0) return !!uploadedFile && !extracting && !!pdfResult;
    if (step === 1) return isStep1Valid();
    if (step === 2) return checksComplete;
    if (step === 3) return findings.length > 0;
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  /* ───────── render ───────── */

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit a Tender"
        subtitle="Upload a tender document, check it against procurement regulations, and generate a compliance report."
      />

      <DemoNotice>
        <span className="font-semibold">DECISION SUPPORT ONLY.</span> Automated rule checking provides decision support
        and does not constitute legal advice or an official regulatory clearance. All findings, page evidence, and missing clauses
        must be reviewed and verified by a qualified officer. Sources (official references vs demo rules) are marked throughout.
      </DemoNotice>

      {/* step indicator */}
      <div className="table-scroll">
        <ol className="flex min-w-max items-center gap-0">
          {STEP_LABELS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="flex items-center">
                <button
                  onClick={() => { if (done) setStep(i); }}
                  disabled={!done}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : done
                        ? "border-success/30 bg-success/8 text-success cursor-pointer hover:bg-success/15"
                        : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[10px] font-bold ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-success text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  {label}
                </button>
                {i < STEP_LABELS.length - 1 && (
                  <span className={`mx-1 h-px w-6 ${i < step ? "bg-success" : "bg-border"}`} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* step content */}
      {step === 0 && <StepUpload
        fileRef={fileRef}
        uploadedFile={uploadedFile}
        extracting={extracting}
        dragOver={dragOver}
        setDragOver={setDragOver}
        handleDrop={handleDrop}
        handleFiles={handleFiles}
        onSelectSample={loadSamplePdf}
        pdfResult={pdfResult}
        pdfError={pdfError}
        onProceed={() => setStep(1)}
      />}

      {step === 1 && (
        <StepReview
          form={form}
          errors={errors}
          set={set}
          pdfResult={pdfResult}
          showExtractedText={showExtractedText}
          setShowExtractedText={setShowExtractedText}
          onProceed={goNext}
          isValid={isStep1Valid()}
        />
      )}

      {step === 2 && (
        <StepChecks
          checking={checking}
          checkProgress={checkProgress}
          checksComplete={checksComplete}
          runChecks={runChecks}
          findingCounts={findingCounts}
          onProceed={goNext}
        />
      )}

      {step === 3 && (
        <StepFindings
          findings={findings}
          findingCounts={findingCounts}
          overallScore={overallScore}
          scoreExplanation={SCORE_EXPLANATION}
          reviewStatusInfo={reviewStatusInfo}
          verifiedCount={verifiedCount}
          updateFinding={updateFinding}
          updateOfficerNote={updateOfficerNote}
          toggleVerifyFinding={toggleVerifyFinding}
          verifyAllFindings={verifyAllFindings}
          aiReport={aiReport}
          role={role}
          onProceed={goNext}
        />
      )}

      {step === 4 && (
        <StepReport
          form={form}
          findings={findings}
          findingCounts={findingCounts}
          overallScore={overallScore}
          scoreExplanation={SCORE_EXPLANATION}
          reviewStatusInfo={reviewStatusInfo}
          verifiedCount={verifiedCount}
          uploadedFile={uploadedFile}
          aiReport={aiReport}
          role={role}
          userName={user?.name}
          onSave={saveAndCreate}
        />
      )}

      {/* navigation buttons */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          {step > 0 && (
            <Btn variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4" /> Back
            </Btn>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step < STEP_LABELS.length - 1 && (
            <Btn onClick={goNext} disabled={!canGoNext()}>
              Next <ArrowRight className="size-4" />
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Step 0: Upload ───────── */

function StepUpload({
  fileRef,
  uploadedFile,
  extracting,
  dragOver,
  setDragOver,
  handleDrop,
  handleFiles,
  onSelectSample,
  pdfResult,
  pdfError,
  onProceed,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  uploadedFile: File | null;
  extracting: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFiles: (files: FileList | null) => void;
  onSelectSample: (href: string) => void;
  pdfResult: PdfExtractionResult | null;
  pdfError: PdfExtractionError | null;
  onProceed: () => void;
}) {
  return (
    <Panel title="Step 1 — Upload Tender Document" description="Upload your tender document (PDF) to begin the compliance audit. Text will be extracted locally in your browser — nothing is sent externally.">
      {extracting ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-sm font-semibold">Extracting text from PDF…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reading pages and pulling out text content. This runs entirely in your browser.
            </p>
          </div>
        </div>
      ) : pdfError && uploadedFile ? (
        /* ── Extraction error ── */
        <div className="flex flex-col items-center gap-4 py-8">
          <span className="grid size-12 place-items-center rounded-lg bg-destructive/12 text-destructive">
            <AlertCircle className="size-6" />
          </span>
          <div className="max-w-md text-center">
            <p className="text-sm font-semibold text-destructive">
              {pdfError.errorType === "no-text"
                ? "No readable text found"
                : pdfError.errorType === "password-protected"
                  ? "Password-protected PDF"
                  : pdfError.errorType === "empty"
                    ? "Empty file"
                    : "Could not read PDF"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {pdfError.message}
            </p>
          </div>
          <Btn
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" /> Try a different file
          </Btn>
        </div>
      ) : uploadedFile && pdfResult ? (
        /* ── Successful extraction summary ── */
        <div className="flex flex-col items-center gap-3 py-8">
          <span className="grid size-12 place-items-center rounded-lg bg-success/12 text-success">
            <Check className="size-6" />
          </span>
          <p className="text-sm font-semibold">{uploadedFile.name}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatFileSize(pdfResult.fileSize)}</span>
            <span>{pdfResult.totalPages} page{pdfResult.totalPages === 1 ? "" : "s"}</span>
            <span>{pdfResult.fullText.split(/\s+/).length.toLocaleString()} words extracted</span>
          </div>
          {pdfResult.emptyPageNumbers.length > 0 && (
            <p className="max-w-md text-center text-[11px] text-warning">
              <TriangleAlert className="mr-1 inline size-3" />
              {pdfResult.emptyPageNumbers.length} of {pdfResult.totalPages} page(s) had no
              extractable text (possibly scanned/image pages). Those pages will be skipped
              during compliance checks.
            </p>
          )}
          {pdfResult.info.title && (
            <p className="text-xs text-muted-foreground">
              PDF title: &ldquo;{pdfResult.info.title}&rdquo;
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Btn
              onClick={onProceed}
              className="font-medium"
            >
              Continue to Step 2 — Review Details <ArrowRight className="size-4" />
            </Btn>
            <Btn
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              Choose different file
            </Btn>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed py-16 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/30"
          }`}
        >
          <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Upload className="size-6" />
          </span>
          <div className="text-center">
            <p className="text-sm font-semibold">
              Drop your tender PDF here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accepts PDF files up to 10 MB · Text is extracted in your browser
            </p>
          </div>
          <Btn size="sm" variant="outline">
            <Upload className="size-3.5" /> Choose File
          </Btn>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* ─── Try a sample PDF ─── */}
      <div className="mt-6 rounded-lg border border-dashed border-primary/30 bg-primary/3 p-5">
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Try a sample PDF
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Select or download one of these fictional sample tender documents to test the complete compliance audit workflow.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_PDFS.map((s) => (
            <div
              key={s.href}
              className="flex flex-col justify-between rounded-md border bg-card p-3.5 transition-colors hover:border-primary/40 space-y-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-foreground">{s.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => onSelectSample(s.href)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <FileSearch className="size-3.5" /> Audit This Sample
                </button>
                <a
                  href={s.href}
                  download
                  className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/40 transition-colors"
                  title="Download PDF to your computer"
                >
                  <Download className="size-3.5" /> Download
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[10px] italic text-muted-foreground">
          Illustrative demos only — not official tender or government documents.
        </p>
      </div>
    </Panel>
  );
}

/* ───────── Step 1: Review ───────── */

function StepReview({
  form,
  errors,
  set,
  pdfResult,
  showExtractedText,
  setShowExtractedText,
  onProceed,
  isValid,
}: {
  form: { title: string; department: string; type: string; value: string; issueDate: string; closingDate: string; description: string };
  errors: Record<string, string>;
  set: <K extends keyof typeof form>(key: K, v: (typeof form)[K]) => void;
  pdfResult: PdfExtractionResult | null;
  showExtractedText: boolean;
  setShowExtractedText: (v: boolean) => void;
  onProceed: () => void;
  isValid: boolean;
}) {
  const TENDER_TYPES = [
    "Open Tender (Goods)",
    "Open Tender (Works)",
    "Limited Tender (Services)",
    "Rate Contract",
    "Quality & Cost Based Selection",
  ];

  return (
    <Panel title="Step 2 — Review Extracted Details" description="Review the details below. Edit anything that wasn't extracted correctly.">
      <div className="space-y-4">
        <div className="rounded-md border border-info/25 bg-info/5 px-3.5 py-2.5 text-xs text-muted-foreground">
          These details were extracted from your uploaded document. Please verify and correct anything before proceeding.
        </div>

        <Field label="Tender Title" required error={errors.title}>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Supply of IT Equipment for Headquarters"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" required error={errors.department}>
            <select
              className={inputClass}
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <Field label="Tender Type">
            <select
              className={inputClass}
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {TENDER_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Estimated Value (₹)" required error={errors.value} hint="Enter the amount in rupees">
          <input
            className={inputClass}
            value={form.value}
            onChange={(e) => set("value", e.target.value)}
            placeholder="e.g. 5000000"
            type="number"
            min="0"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Publication Date">
            <input
              className={inputClass}
              type="date"
              value={form.issueDate}
              onChange={(e) => set("issueDate", e.target.value)}
            />
          </Field>
          <Field label="Submission Deadline">
            <input
              className={inputClass}
              type="date"
              value={form.closingDate}
              onChange={(e) => set("closingDate", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Description" required error={errors.description}>
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Brief description of the tender scope and requirements"
          />
        </Field>

        {/* ─── Extracted text preview ─── */}
        {pdfResult && (
          <div className="rounded-lg border bg-muted/30">
            <button
              type="button"
              onClick={() => setShowExtractedText(!showExtractedText)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-2">
                <Eye className="size-4 text-muted-foreground" />
                Review Extracted Text
                <span className="text-xs font-normal text-muted-foreground">
                  ({pdfResult.totalPages} page{pdfResult.totalPages === 1 ? "" : "s"}, {pdfResult.fullText.split(/\s+/).length.toLocaleString()} words)
                </span>
              </span>
              <ArrowRight className={`size-4 text-muted-foreground transition-transform ${showExtractedText ? "rotate-90" : ""}`} />
            </button>

            {showExtractedText && (
              <div className="border-t px-4 py-3">
                {pdfResult.emptyPageNumbers.length > 0 && (
                  <p className="mb-3 rounded border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
                    <TriangleAlert className="mr-1 inline size-3" />
                    Pages {pdfResult.emptyPageNumbers.join(", ")} had no extractable text
                    (scanned or image-only). OCR is not available in this prototype.
                  </p>
                )}
                <div className="max-h-96 space-y-4 overflow-y-auto">
                  {pdfResult.pages.map((page) => (
                    <div key={page.pageNumber}>
                      <p className="sticky top-0 mb-1 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Page {page.pageNumber}
                      </p>
                      {page.text ? (
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                          {page.text}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          No extractable text on this page (scanned or image-only).
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* bottom continue button */}
        <div className="flex justify-end pt-3 border-t border-border/50">
          <Btn onClick={onProceed} disabled={!isValid}>
            Proceed to Step 3 — Run Checks <ArrowRight className="size-4" />
          </Btn>
        </div>
      </div>
    </Panel>
  );
}

/* ───────── Step 2: Run Checks ───────── */

function StepChecks({
  checking,
  checkProgress,
  checksComplete,
  runChecks,
  findingCounts,
  onProceed,
}: {
  checking: boolean;
  checkProgress: number;
  checksComplete: boolean;
  runChecks: () => void;
  findingCounts: Record<FindingStatus, number>;
  onProceed: () => void;
}) {
  const officialCount = AUDIT_RULES.filter((r) => r.source.type === "reference").length;
  const demoCount = AUDIT_RULES.filter((r) => r.source.type === "demo").length;

  return (
    <div className="space-y-4">
      <Panel
        title="Step 3 — Run Compliance Checks"
        description="We'll evaluate the extracted tender text against verified source-based procurement rules."
      >
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Audit Rules to Run ({AUDIT_RULES.length} rules)
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Pill tone="info">{officialCount} Official References</Pill>
                <Pill tone="neutral">{demoCount} Demo Rules</Pill>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIT_RULES.map((r) => (
                <div key={r.id} className="flex items-start gap-2 rounded border border-border/60 bg-card p-2 text-xs">
                  <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium truncate">{r.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{r.category}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
                      Source: {r.source.name} ({r.source.type === "reference" ? "Official" : "Demo"})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Source-Based, Explainable Rule Checking</p>
                <p className="mt-0.5">
                  Every check returns evidence snippets with exact page numbers. Results are strictly decision support,
                  not legal advice. All findings require human review before verification.
                </p>
              </div>
            </div>
          </div>

          {checking && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Loader2 className="size-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Checking compliance against rule sources… {checkProgress}%</p>
              </div>
              <ProgressBar value={checkProgress} />
            </div>
          )}

          {checksComplete && (
            <div className="space-y-3">
              <div className="rounded-md border border-success/30 bg-success/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-success" />
                  <p className="text-sm font-semibold text-success">Rule evaluation complete</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {AUDIT_RULES.length} rules checked · {findingCounts.Found} Found · {findingCounts.Missing} Missing · {findingCounts["Needs Review"]} Needs Review
                </p>
              </div>
              <Btn onClick={onProceed} className="w-full sm:w-auto font-medium">
                Review Audit Findings ({AUDIT_RULES.length}) <ArrowRight className="size-4" />
              </Btn>
            </div>
          )}

          {!checking && !checksComplete && (
            <Btn onClick={runChecks} className="w-full sm:w-auto">
              <ClipboardCheck className="size-4" /> Run Compliance Checks
            </Btn>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ───────── Step 3: Findings ───────── */

function StepFindings({
  findings,
  findingCounts,
  overallScore,
  scoreExplanation,
  reviewStatusInfo,
  verifiedCount,
  updateFinding,
  updateOfficerNote,
  toggleVerifyFinding,
  verifyAllFindings,
  aiReport,
  role,
  onProceed,
}: {
  findings: AuditFinding[];
  findingCounts: Record<FindingStatus, number>;
  overallScore: number;
  scoreExplanation: string;
  reviewStatusInfo: { label: string; tone: "success" | "danger" | "warning" | "neutral"; description: string };
  verifiedCount: number;
  updateFinding: (index: number, status: FindingStatus) => void;
  updateOfficerNote: (index: number, note: string) => void;
  toggleVerifyFinding: (index: number) => void;
  verifyAllFindings: () => void;
  aiReport?: AiReviewReport | null;
  role?: string;
  onProceed: () => void;
}) {
  const isAuditor = role === "auditor";
  const [priorityFilter, setPriorityFilter] = useState<"All" | RulePriority>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | FindingStatus>("All");

  const highPriority = useMemo(() => findings.filter((f) => f.priority === "High"), [findings]);
  const medPriority = useMemo(() => findings.filter((f) => f.priority === "Medium"), [findings]);
  const lowPriority = useMemo(() => findings.filter((f) => f.priority === "Low"), [findings]);

  // Map original indices so filtering doesn't break update callbacks
  const indexedFindings = useMemo(
    () => findings.map((f, origIndex) => ({ finding: f, origIndex })),
    [findings],
  );

  const filteredFindings = useMemo(() => {
    return indexedFindings.filter(({ finding: f }) => {
      if (priorityFilter !== "All" && f.priority !== priorityFilter) return false;
      if (statusFilter !== "All" && f.status !== statusFilter) return false;
      return true;
    });
  }, [indexedFindings, priorityFilter, statusFilter]);

  const priorityGroups: { priority: RulePriority; label: string; description: string; items: typeof indexedFindings }[] = [
    {
      priority: "High",
      label: "High Priority Rules",
      description: "Critical statutory, financial & eligibility requirements (GFR 2017 & CVC guidelines)",
      items: filteredFindings.filter(({ finding: f }) => f.priority === "High"),
    },
    {
      priority: "Medium",
      label: "Medium Priority Rules",
      description: "Contractual compliance, governance, delivery timelines & dispute resolution",
      items: filteredFindings.filter(({ finding: f }) => f.priority === "Medium"),
    },
    {
      priority: "Low",
      label: "Low Priority Rules",
      description: "Operational guidelines, document accessibility & advisory provisions",
      items: filteredFindings.filter(({ finding: f }) => f.priority === "Low"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Prominent Decision support banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3.5 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Automated Review — Human Verification Required</p>
              <p className="mt-0.5 leading-relaxed text-[11px] text-muted-foreground">
                Automated rule checking provides decision support and does not constitute legal advice or an official regulatory clearance.
                Please review evidence citations with page numbers, record review remarks, and confirm verification status below.
              </p>
            </div>
          </div>
          {verifiedCount < findings.length && !isAuditor && (
            <Btn size="sm" variant="outline" onClick={verifyAllFindings} className="shrink-0 self-start sm:self-center">
              <Check className="size-3.5" /> Verify All ({findings.length - verifiedCount} remaining)
            </Btn>
          )}
        </div>
      </div>

      {/* Assistant Mode & Status */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-semibold text-foreground">Assistant Mode:</span>
            <span className="text-muted-foreground">
              {aiReport?.mode === "live-ai"
                ? "Live Connected AI Service"
                : "Rule-Based Offline Fallback (Private API keys kept off browser client)"}
            </span>
          </div>
          <Pill tone="neutral">
            {aiReport?.mode === "live-ai" ? "API Verified" : "Offline Rule Fallback"}
          </Pill>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Deterministic rule engine results are shown alongside clause summaries and gap analyses.
          Every cited quote is strictly verified against extracted tender text.
        </p>
      </div>

      <Panel
        title="Step 4 — Review Findings & Verify Evidence"
        description="Review rule checks grouped by priority and status. Inspect page citations, add officer notes, and confirm human verification."
      >
        {/* Score & Review Status Overview */}
        <div className="mb-6 rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{overallScore}%</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rule Coverage Score
                </span>
                <Pill tone={reviewStatusInfo.tone} dot>{reviewStatusInfo.label}</Pill>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                {scoreExplanation}
              </p>
            </div>
            <div className="text-right sm:border-l sm:border-border sm:pl-4">
              <p className="text-xs font-semibold text-foreground">Human Verification</p>
              <p className="text-sm font-bold text-primary">
                {verifiedCount} / {findings.length} Verified
              </p>
              <p className="text-[11px] text-muted-foreground">
                {verifiedCount === findings.length ? "All confirmed" : "Verification pending"}
              </p>
            </div>
          </div>
          <ProgressBar value={overallScore} />
        </div>

        {/* Priority and Status Filters */}
        <div className="mb-5 space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Filter className="size-3.5" /> Filter Findings:
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Showing:</span>
              <strong className="text-foreground">{filteredFindings.length} of {findings.length} rules</strong>
              {(priorityFilter !== "All" || statusFilter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setPriorityFilter("All");
                    setStatusFilter("All");
                  }}
                  className="ml-1 text-[11px] text-primary hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Priority Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Priority Level</label>
              <div className="flex flex-wrap gap-1.5">
                {(["All", "High", "Medium", "Low"] as const).map((p) => {
                  const count =
                    p === "All"
                      ? findings.length
                      : p === "High"
                        ? highPriority.length
                        : p === "Medium"
                          ? medPriority.length
                          : lowPriority.length;
                  const active = priorityFilter === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriorityFilter(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-card border border-border text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      {p === "All" ? "All Priorities" : `${p} Priority`}
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Audit Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(["All", ...FINDING_STATUSES] as const).map((s) => {
                  const count = s === "All" ? findings.length : findingCounts[s];
                  const active = statusFilter === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-card border border-border text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      {s}
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Findings List Grouped by Priority */}
        <div className="space-y-6">
          {priorityGroups.map((grp) => {
            if (grp.items.length === 0) return null;

            return (
              <div key={grp.priority} className="space-y-3">
                {/* Priority Group Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${
                        grp.priority === "High"
                          ? "bg-destructive"
                          : grp.priority === "Medium"
                            ? "bg-warning"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <h3 className="text-sm font-bold text-foreground">{grp.label}</h3>
                    <Pill
                      tone={
                        grp.priority === "High"
                          ? "danger"
                          : grp.priority === "Medium"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {grp.items.length} {grp.items.length === 1 ? "rule" : "rules"}
                    </Pill>
                  </div>
                  <p className="text-[11px] text-muted-foreground hidden sm:block">
                    {grp.description}
                  </p>
                </div>

                {/* Items in this Priority Group */}
                <div className="space-y-4">
                  {grp.items.map(({ finding: f, origIndex }) => {
                    const meta = FINDING_META[f.status];
                    const Icon = meta.icon;
                    const aiSuggestion = aiReport?.suggestions.find((s) => s.ruleId === f.ruleId);

                    return (
                      <div
                        key={f.ruleId}
                        className={`rounded-lg border p-4 transition-colors ${
                          f.humanVerified
                            ? "border-success/30 bg-card hover:bg-success/5"
                            : "border-border bg-card hover:bg-accent/15"
                        }`}
                      >
                        <div className="flex flex-col gap-3">
                          {/* Header: Title, Category, Source, Status & Controls */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <span
                                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md ${
                                  f.status === "Found"
                                    ? "bg-success/12 text-success"
                                    : f.status === "Missing"
                                      ? "bg-destructive/12 text-destructive"
                                      : f.status === "Needs Review"
                                        ? "bg-warning/15 text-warning-foreground"
                                        : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <Icon className="size-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold">{f.ruleName}</p>
                                  <Pill
                                    tone={
                                      f.priority === "High"
                                        ? "danger"
                                        : f.priority === "Medium"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    {f.priority} Priority
                                  </Pill>
                                  <Pill>{f.category}</Pill>
                                  {f.source.type === "reference" ? (
                                    <Pill tone="info">Official Reference</Pill>
                                  ) : (
                                    <Pill tone="neutral">Demo Rule</Pill>
                                  )}
                                  <Pill
                                    tone={
                                      f.confidence === "High"
                                        ? "success"
                                        : f.confidence === "Medium"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    Deterministic: {f.confidence} Confidence
                                  </Pill>
                                </div>

                                {/* Source citation info */}
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                                  <span>
                                    Source: <strong className="font-medium text-foreground">{f.source.name}</strong>
                                  </span>
                                  <span>·</span>
                                  <span>{f.source.authority}</span>
                                  {f.source.version && (
                                    <>
                                      <span>·</span>
                                      <span>{f.source.version}</span>
                                    </>
                                  )}
                                  {f.source.url && (
                                    <>
                                      <span>·</span>
                                      <a
                                        href={f.source.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                      >
                                        Source Document <ExternalLink className="size-2.5" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Status & Verification controls */}
                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                              <Pill tone={meta.tone} dot>{f.status}</Pill>
                              {!isAuditor && (
                                <select
                                  value={f.status}
                                  onChange={(e) => updateFinding(origIndex, e.target.value as FindingStatus)}
                                  className="h-7 rounded border border-input bg-card px-2 text-xs"
                                  title="Officer status override"
                                >
                                  {FINDING_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleVerifyFinding(origIndex)}
                                className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                                  f.humanVerified
                                    ? "border-success/40 bg-success/10 text-success hover:bg-success/20"
                                    : "border-border bg-card text-muted-foreground hover:bg-accent/40"
                                }`}
                                title={f.humanVerified ? "Click to unmark verification" : "Click to mark as verified"}
                              >
                                <Check className={`size-3.5 ${f.humanVerified ? "stroke-[3]" : ""}`} />
                                {f.humanVerified ? "Verified" : "Verify"}
                              </button>
                            </div>
                          </div>

                          {/* Rule explanation */}
                          <p className="text-xs text-foreground/90 pl-10 leading-relaxed">
                            <strong>Rule Check:</strong> {f.explanation}
                          </p>

                          {/* Deterministic evidence snippet with page number */}
                          {f.evidence.length > 0 ? (
                            <div className="ml-10 space-y-1.5 rounded-md border border-border/70 bg-muted/30 p-2.5">
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Document Evidence ({f.evidence.length} match{f.evidence.length > 1 ? "es" : ""}):
                              </p>
                              {f.evidence.map((ev, evIdx) => (
                                <div key={evIdx} className="text-xs leading-relaxed">
                                  <span className="font-semibold text-primary">Page {ev.pageNumber}:</span>{" "}
                                  <span className="italic text-foreground/85">&ldquo;{ev.text}&rdquo;</span>
                                </div>
                              ))}
                            </div>
                          ) : f.status === "Missing" ? (
                            <div className="ml-10 rounded border border-dashed border-border/80 p-2 text-[11px] text-muted-foreground italic">
                              No matching clauses or keywords found in the extracted tender text.
                            </div>
                          ) : null}

                          {/* Assistant Review & Gap Analysis */}
                          {aiSuggestion && (
                            <div className="ml-10 rounded-md border border-primary/25 bg-primary/4 p-3 text-xs space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-primary/10 pb-1.5">
                                <span className="flex items-center gap-1.5 font-semibold text-primary">
                                  <Sparkles className="size-3.5" />
                                  Assistant Review &amp; Gap Analysis
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Pill tone="neutral">
                                    {aiSuggestion.sourceMode === "live-ai" ? "Live AI" : "Non-AI Fallback"}
                                  </Pill>
                                  <Pill
                                    tone={
                                      aiSuggestion.recommendedStatus === "Found"
                                        ? "success"
                                        : aiSuggestion.recommendedStatus === "Missing"
                                          ? "danger"
                                          : "warning"
                                    }
                                  >
                                    Suggested: {aiSuggestion.recommendedStatus}
                                  </Pill>
                                </div>
                              </div>

                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground text-[11px]">Clause Summary:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {aiSuggestion.clauseSummary}
                                </p>
                              </div>

                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground text-[11px]">Gap &amp; Risk Analysis:</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  {aiSuggestion.gapAnalysis}
                                </p>
                              </div>

                              {aiSuggestion.citedExcerpt && (
                                <div className="rounded border border-primary/15 bg-background/70 p-2 text-[11px] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-primary">
                                      Cited Quote (Page {aiSuggestion.pageNumber}):
                                    </span>
                                    {aiSuggestion.isValidSourceExcerpt ? (
                                      <span className="text-success inline-flex items-center gap-1 font-medium text-[10px]">
                                        <Check className="size-3" /> Grounded in extracted text
                                      </span>
                                    ) : (
                                      <span className="text-destructive inline-flex items-center gap-1 font-medium text-[10px]">
                                        <AlertCircle className="size-3" /> Unverified excerpt
                                      </span>
                                    )}
                                  </div>
                                  <p className="italic text-foreground/85 leading-snug">
                                    &ldquo;{aiSuggestion.citedExcerpt}&rdquo;
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Officer Review Remarks / Audit Note */}
                          <div className="ml-10 rounded-md border border-border/70 bg-card/60 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                                <MessageSquare className="size-3" /> Officer Review Remarks &amp; Audit Note:
                              </span>
                              <div className="flex items-center gap-2">
                                {f.humanVerified ? (
                                  <span className="text-[10px] text-success font-medium inline-flex items-center gap-0.5">
                                    <Check className="size-3" /> Verified by Officer
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-warning font-medium">
                                    Verification Pending
                                  </span>
                                )}
                              </div>
                            </div>
                            <textarea
                              value={f.officerNotes || ""}
                              onChange={(e) => updateOfficerNote(origIndex, e.target.value)}
                              placeholder="Enter officer notes, justifications, clarifications, or audit remarks for this finding..."
                              rows={2}
                              className="w-full rounded border border-input bg-background/80 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-border/50">
          <Btn onClick={onProceed} className="font-medium">
            Proceed to Step 5 — Generate Report <ArrowRight className="size-4" />
          </Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ───────── Step 4: Report ───────── */

function StepReport({
  form,
  findings,
  findingCounts,
  overallScore,
  scoreExplanation,
  reviewStatusInfo,
  verifiedCount,
  uploadedFile,
  aiReport,
  role,
  userName,
  onSave,
}: {
  form: { title: string; department: string; type: string; value: string; issueDate?: string; closingDate?: string; description?: string };
  findings: AuditFinding[];
  findingCounts: Record<FindingStatus, number>;
  overallScore: number;
  scoreExplanation: string;
  reviewStatusInfo: { label: string; tone: "success" | "danger" | "warning" | "neutral"; description: string };
  verifiedCount: number;
  uploadedFile: File | null;
  aiReport?: AiReviewReport | null;
  role?: string;
  userName?: string;
  onSave: () => void;
}) {
  const isAuditor = role === "auditor";
  const officialChecked = findings.filter((f) => f.source.type === "reference");
  const demoChecked = findings.filter((f) => f.source.type === "demo");

  const highPriority = findings.filter((f) => f.priority === "High");
  const medPriority = findings.filter((f) => f.priority === "Medium");
  const lowPriority = findings.filter((f) => f.priority === "Low");

  const handleDownloadPdf = () => {
    downloadAuditReportPdf({
      tender: {
        title: form.title,
        department: form.department,
        type: form.type,
        value: Number(form.value) || 0,
        issueDate: form.issueDate,
        closingDate: form.closingDate,
        description: form.description,
      },
      filename: uploadedFile?.name || "tender-document.pdf",
      auditDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      score: overallScore,
      scoreExplanation,
      reviewStatus: reviewStatusInfo.label,
      findings,
      verifiedCount,
      officerName: userName || "Procurement Officer",
    });
    toast.success("Audit report downloaded", {
      description: "Automated review report saved as PDF (human verification required).",
    });
  };

  return (
    <div className="space-y-4">
      {/* Prominent Mandatory Decision Support Banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-4 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-start gap-2.5">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Automated review — human verification required</p>
            <p className="leading-relaxed text-muted-foreground">
              This automated audit report is generated as <strong>decision support</strong> for procurement officers and auditors.
              It is <strong>NOT an audit clearance certificate</strong>, does not claim or warrant that the tender is legally compliant,
              and does not replace statutory audit processes. All findings, cited excerpts, and regulatory gaps must be reviewed and confirmed by an authorized officer.
            </p>
          </div>
        </div>
      </div>

      <Panel
        title="Step 5 — Audit Summary & Report Generation"
        description="Review the complete audit summary below. Export a downloadable PDF audit report or save the tender to database."
      >
        <div className="space-y-6">
          {/* Summary Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tender Details */}
            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tender &amp; Document Details</p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Title</dt>
                  <dd className="font-medium text-right max-w-[60%] truncate">{form.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="font-medium">{form.department}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium">{form.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Estimated Value</dt>
                  <dd className="font-medium">{formatINR(Number(form.value))}</dd>
                </div>
                {uploadedFile && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Source Document</dt>
                    <dd className="font-medium truncate max-w-[60%] font-mono text-xs">{uploadedFile.name}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Review Status</dt>
                  <dd className="font-medium">
                    <Pill tone={reviewStatusInfo.tone} dot>{reviewStatusInfo.label}</Pill>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Compliance Score */}
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rule Coverage Score</p>
                <Pill tone={reviewStatusInfo.tone} dot>{reviewStatusInfo.label}</Pill>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">{overallScore}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {findings.length} rules checked across source regulations
                </p>
              </div>
              <ProgressBar value={overallScore} />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {scoreExplanation}
              </p>
              <div className="flex justify-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-success" /> {findingCounts.Found} Found
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-destructive" /> {findingCounts.Missing} Missing
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-warning" /> {findingCounts["Needs Review"]} Review
                </span>
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{verifiedCount} of {findings.length}</span> findings verified by human reviewer
              </div>
            </div>
          </div>

          {/* Grouped Findings Summary by Priority */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Findings Grouped by Priority
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {/* High Priority Box */}
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-destructive text-xs">HIGH PRIORITY</span>
                  <Pill tone="danger">{highPriority.length} rules</Pill>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Statutory, financial &amp; integrity requirements.
                </p>
                <div className="text-xs space-y-1 pt-1 border-t border-destructive/20 font-medium">
                  <div className="flex justify-between">
                    <span className="text-destructive">Missing:</span>
                    <span>{highPriority.filter((f) => f.status === "Missing").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warning">Needs Review:</span>
                    <span>{highPriority.filter((f) => f.status === "Needs Review").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-success">Found:</span>
                    <span>{highPriority.filter((f) => f.status === "Found").length}</span>
                  </div>
                </div>
              </div>

              {/* Medium Priority Box */}
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-warning-foreground text-xs">MEDIUM PRIORITY</span>
                  <Pill tone="warning">{medPriority.length} rules</Pill>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Contractual standards, liquidated damages &amp; arbitration.
                </p>
                <div className="text-xs space-y-1 pt-1 border-t border-warning/20 font-medium">
                  <div className="flex justify-between">
                    <span className="text-destructive">Missing:</span>
                    <span>{medPriority.filter((f) => f.status === "Missing").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-warning">Needs Review:</span>
                    <span>{medPriority.filter((f) => f.status === "Needs Review").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-success">Found:</span>
                    <span>{medPriority.filter((f) => f.status === "Found").length}</span>
                  </div>
                </div>
              </div>

              {/* Low Priority Box */}
              <div className="rounded-md border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">LOW / ADVISORY</span>
                  <Pill tone="neutral">{lowPriority.length} rules</Pill>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Operational details, format, accessibility &amp; fee provisions.
                </p>
                <div className="text-xs space-y-1 pt-1 border-t border-border font-medium">
                  <div className="flex justify-between">
                    <span className="text-destructive">Missing:</span>
                    <span>{lowPriority.filter((f) => f.status === "Missing").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-success">Found:</span>
                    <span>{lowPriority.filter((f) => f.status === "Found").length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sources and Assistant Methodology Breakdown */}
          <div className="rounded-md border border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Review Methodology &amp; Sources Checked ({findings.length} rules)
            </p>
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Official References</span>
                  <Pill tone="info">{officialChecked.length} rules</Pill>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  General Financial Rules (GFR 2017) &amp; Central Vigilance Commission (CVC) guidelines.
                </p>
              </div>
              <div className="rounded border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Demo Rule Library</span>
                  <Pill tone="neutral">{demoChecked.length} rules</Pill>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Academic prototype rules for technical, financial, and environmental compliance testing.
                </p>
              </div>
              <div className="rounded border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Assistant Mode</span>
                  <Pill tone="neutral">
                    {aiReport?.mode === "live-ai" ? "Live AI" : "Offline Fallback"}
                  </Pill>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  {aiReport?.mode === "live-ai"
                    ? "Live AI model with verified citations."
                    : "Deterministic offline rule engine. Private API keys kept securely off browser."}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Findings Table in Report View */}
          <div className="rounded-md border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Audit Findings &amp; Human Review Summary ({findings.length} rules)
              </p>
              <span className="text-xs text-muted-foreground">
                {verifiedCount} of {findings.length} findings verified
              </span>
            </div>
            <div className="table-scroll">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                    <th className="py-2 px-2.5 font-semibold">Priority</th>
                    <th className="py-2 px-2.5 font-semibold">Rule / Check</th>
                    <th className="py-2 px-2.5 font-semibold">Status</th>
                    <th className="py-2 px-2.5 font-semibold">Source Reference</th>
                    <th className="py-2 px-2.5 font-semibold">Evidence Location</th>
                    <th className="py-2 px-2.5 font-semibold">Review Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {findings.map((f) => (
                    <tr key={f.ruleId} className="hover:bg-muted/20">
                      <td className="py-2 px-2.5">
                        <Pill
                          tone={
                            f.priority === "High"
                              ? "danger"
                              : f.priority === "Medium"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {f.priority}
                        </Pill>
                      </td>
                      <td className="py-2 px-2.5">
                        <p className="font-medium text-foreground">{f.ruleName}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{f.explanation}</p>
                        {f.officerNotes && (
                          <p className="mt-0.5 text-[10px] text-primary italic line-clamp-1">
                            Note: {f.officerNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <Pill tone={FINDING_META[f.status].tone} dot>{f.status}</Pill>
                      </td>
                      <td className="py-2 px-2.5 text-[11px] text-muted-foreground">
                        {f.source.name}
                      </td>
                      <td className="py-2 px-2.5 text-[11px]">
                        {f.evidence[0] ? (
                          <span className="text-primary font-medium">Page {f.evidence[0].pageNumber}</span>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        {f.humanVerified ? (
                          <span className="inline-flex items-center gap-1 text-success font-medium text-[11px]">
                            <Check className="size-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Auditor notice */}
          {isAuditor && (
            <div className="rounded-md border border-info/30 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
              <strong>Read-only:</strong> Auditors can review findings and evidence but cannot create tenders. Contact a Procurement Officer to save this audit.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Btn onClick={onSave} disabled={isAuditor}>
              <FileSearch className="size-4" /> Save &amp; Create Tender
            </Btn>
            <Btn
              variant="outline"
              onClick={handleDownloadPdf}
            >
              <Download className="size-4" /> Download Report (PDF)
            </Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
}

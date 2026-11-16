import {
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  Paperclip,
  PencilLine,
  Plus,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ComplianceBadge, Pill, YesNo } from "@/components/common/badges";
import {
  Btn,
  EmptyState,
  Field,
  inputClass,
  Modal,
  ProgressBar,
  TableShell,
  Td,
  Th,
  textareaClass,
} from "@/components/common/primitives";
import { COMPLIANCE_STATUSES, type ComplianceItem, type ComplianceStatus } from "@/data/demoData";
import { compliancePercent, useStore } from "@/store/app-store";
import { EvidenceUploader } from "@/components/compliance/evidence-uploader";
import type { EvidenceFile } from "@/lib/api/evidence";

/** Plain-language explanations shown alongside compliance statuses */
const STATUS_EXPLANATIONS: Record<string, { label: string; explanation: string }> = {
  Compliant: {
    label: "Found",
    explanation: "This requirement has been addressed and evidence is on file.",
  },
  Pending: {
    label: "Needs Review",
    explanation: "Needs to be reviewed and verified by the responsible officer.",
  },
  "Partially Compliant": {
    label: "Partially Addressed",
    explanation: "Some aspects are met, but gaps remain.",
  },
  "Non-Compliant": {
    label: "Missing",
    explanation: "This requirement has not been addressed. Action is needed.",
  },
  "Not Applicable": {
    label: "Not Applicable",
    explanation: "Does not apply to this tender or contract.",
  },
};

export function ComplianceProgress({ items }: { items: ComplianceItem[] }) {
  const applicable = items.filter((i) => i.status !== "Not Applicable");
  const done = applicable.filter((i) => i.status === "Compliant").length;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {done} of {applicable.length} applicable requirements completed
        </p>
        <p className="text-2xl font-semibold">{compliancePercent(items)}%</p>
      </div>
      <ProgressBar value={compliancePercent(items)} />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-success" />
          Found — requirement addressed
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-warning" />
          Needs Review — verify manually
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-destructive" />
          Missing — action needed
        </span>
      </div>
    </div>
  );
}

export function ComplianceTable({
  items,
  scopeLabel,
  defaultScope,
  showScopeColumn = false,
}: {
  items: ComplianceItem[];
  scopeLabel?: string;
  defaultScope?: { tenderId?: string; contractId?: string };
  showScopeColumn?: boolean;
}) {
  const { documents, updateCompliance, addCompliance, can, user } = useStore();
  const role = user?.role;
  const [editing, setEditing] = useState<ComplianceItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [sourceView, setSourceView] = useState<string | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<{
    name: string;
    url: string;
    type: string;
  } | null>(null);

  const editable = role !== "auditor" && can("edit");
  const doc = (id: string) => documents.find((d) => d.id === id);

  return (
    <div className="space-y-4">
      {role === "auditor" && (
        <div className="rounded-md border border-info/50 bg-info/10 px-3 py-2 text-sm text-info-foreground inline-flex items-center gap-2 font-medium">
          Auditor Mode: Read-Only
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {scopeLabel ?? "All compliance requirements"} · {items.length} requirements
        </p>
        {editable && defaultScope && (
          <Btn size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> Add Requirement
          </Btn>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No compliance requirements found."
          description="Link an applicable regulation to generate the checklist, or add a requirement manually."
          action={
            editable && defaultScope ? (
              <Btn size="sm" onClick={() => setAdding(true)}>
                <Plus className="size-4" /> Add Requirement
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <TableShell
          className="rounded-md border border-border"
          head={
            <>
              <Th>Requirement</Th>
              <Th>Source Regulation</Th>
              {showScopeColumn && <Th>Applies To</Th>}
              <Th>Applicable</Th>
              <Th>In Tender</Th>
              <Th>Evidence</Th>
              <Th>Status</Th>
              <Th>Remarks</Th>
              <Th className="text-right">Action</Th>
            </>
          }
        >
          {items.map((c) => {
            const source = doc(c.sourceDocId);
            return (
              <tr key={c.id} className="transition-colors hover:bg-accent/40">
                <Td className="max-w-72">
                  <p className="text-sm font-medium">{c.requirement}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.id} · Due {c.dueDate || "—"} · {c.responsible}
                  </p>
                </Td>
                <Td className="max-w-52">
                  <button
                    onClick={() => setSourceView(c.sourceDocId)}
                    className="inline-flex items-start gap-1 text-left text-sm text-primary hover:underline"
                  >
                    {source?.title ?? c.sourceDocId}
                    <ExternalLink className="mt-0.5 size-3 shrink-0" />
                  </button>
                  <p className="text-xs text-muted-foreground">{c.sourceDocId}</p>
                </Td>
                {showScopeColumn && (
                  <Td className="text-xs text-muted-foreground">
                    {c.tenderId ?? c.contractId ?? "—"}
                  </Td>
                )}
                <Td>
                  <YesNo value={c.applicable} />
                </Td>
                <Td>
                  <YesNo value={c.includedInTender} />
                </Td>
                <Td className="max-w-40">
                  {c.evidence ? (
                    <button
                      onClick={() => {
                        // Show evidence in viewer — in mock mode, just show the file name
                        const ext = c.evidence.split(".").pop()?.toLowerCase();
                        const mimeType =
                          ext === "pdf"
                            ? "application/pdf"
                            : ext === "png"
                              ? "image/png"
                              : ext === "jpg" || ext === "jpeg"
                                ? "image/jpeg"
                                : "application/octet-stream";
                        setViewingEvidence({ name: c.evidence, url: "", type: mimeType });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Paperclip className="size-3" />
                      <span className="truncate">{c.evidence}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not attached</span>
                  )}
                </Td>
                <Td>
                  <div className="space-y-0.5">
                    <ComplianceBadge status={c.status} />
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {STATUS_EXPLANATIONS[c.status]?.label ?? c.status}
                      {" — "}
                      {STATUS_EXPLANATIONS[c.status]?.explanation ?? ""}
                    </p>
                  </div>
                </Td>
                <Td className="max-w-56 text-xs text-muted-foreground">{c.remarks || "—"}</Td>
                <Td className="text-right">
                  <Btn
                    size="sm"
                    variant="outline"
                    disabled={!editable}
                    onClick={() => setEditing(c)}
                  >
                    <PencilLine className="size-3.5" /> Update
                  </Btn>
                </Td>
              </tr>
            );
          })}
        </TableShell>
      )}

      {!editable && (
        <p className="text-xs text-muted-foreground">
          Read-only view: your role can review compliance records and evidence but cannot modify
          procurement information.
        </p>
      )}

      {editing && (
        <UpdateComplianceModal
          item={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateCompliance(editing.id, patch);
            toast.success(`${editing.id} updated`, {
              description: patch.status ? `Status set to ${patch.status}.` : "Record updated.",
            });
            setEditing(null);
          }}
        />
      )}

      {adding && defaultScope && (
        <AddRequirementModal
          onClose={() => setAdding(false)}
          onSave={(draft) => {
            const id = addCompliance({
              ...draft,
              ...defaultScope,
              responsible: draft.responsible || user?.name || "Procurement Officer",
            });
            toast.success("Requirement added", { description: `${id} added to the checklist.` });
            setAdding(false);
          }}
        />
      )}

      <Modal
        open={!!sourceView}
        onClose={() => setSourceView(null)}
        title={doc(sourceView ?? "")?.title ?? "Source regulation"}
        description={sourceView ?? ""}
      >
        {sourceView && doc(sourceView) && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Pill tone="primary">{doc(sourceView)!.type}</Pill>
              <Pill>{doc(sourceView)!.authority}</Pill>
              <Pill>v{doc(sourceView)!.version}</Pill>
            </div>
            <p className="text-muted-foreground">{doc(sourceView)!.description}</p>
            <div>
              <p className="font-semibold">Applicability</p>
              <p className="mt-1 text-muted-foreground">{doc(sourceView)!.applicability}</p>
            </div>
            <div>
              <p className="font-semibold">Requirements in this document</p>
              <ul className="mt-1.5 space-y-1.5">
                {doc(sourceView)!.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      {/* Evidence Viewer Modal */}
      <EvidenceViewerModal evidence={viewingEvidence} onClose={() => setViewingEvidence(null)} />
    </div>
  );
}

function UpdateComplianceModal({
  item,
  onClose,
  onSave,
}: {
  item: ComplianceItem;
  onClose: () => void;
  onSave: (patch: Partial<ComplianceItem>) => void;
}) {
  const [status, setStatus] = useState<ComplianceStatus>(item.status);
  const [remarks, setRemarks] = useState(item.remarks);
  const [evidence, setEvidence] = useState(item.evidence);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>(
    // Seed from existing evidence string (mock mode)
    item.evidence
      ? [
          {
            name: item.evidence,
            path: `${item.id}/${item.evidence}`,
            size: 0,
            type: item.evidence.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
            url: "",
            uploadedAt: new Date().toISOString(),
          },
        ]
      : [],
  );
  const [responsible, setResponsible] = useState(item.responsible);
  const [completionDate, setCompletionDate] = useState(item.completionDate);
  const [includedInTender, setIncludedInTender] = useState(item.includedInTender);
  const [error, setError] = useState("");

  // Keep evidence string in sync with uploaded files
  const handleFilesChange = useCallback((files: EvidenceFile[]) => {
    setEvidenceFiles(files);
    setEvidence(files.map((f) => f.name).join(", "));
  }, []);

  const submit = () => {
    if (!status) {
      setError("Select a compliance status.");
      return;
    }
    if (status === "Compliant" && evidenceFiles.length === 0 && !evidence.trim()) {
      setError("Attach evidence before marking a requirement compliant.");
      return;
    }
    setError("");
    onSave({
      status,
      remarks: remarks.trim(),
      evidence:
        evidenceFiles.length > 0 ? evidenceFiles.map((f) => f.name).join(", ") : evidence.trim(),
      responsible: responsible.trim(),
      completionDate:
        status === "Compliant"
          ? completionDate ||
            new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
      applicable: status !== "Not Applicable",
      includedInTender,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Update Compliance"
      description={`${item.id} — ${item.requirement}`}
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Btn>
          <Btn size="sm" onClick={submit}>
            Save changes
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 px-3.5 py-3 text-xs text-muted-foreground">
          Source regulation: <span className="font-medium text-foreground">{item.sourceDocId}</span>{" "}
          · Current status: <span className="font-medium text-foreground">{item.status}</span>
        </div>

        <Field label="Compliance Status" required error={error}>
          <div className="grid gap-2 sm:grid-cols-2">
            {COMPLIANCE_STATUSES.map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  status === s
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                {s}
                {STATUS_EXPLANATIONS[s] && s !== STATUS_EXPLANATIONS[s].label && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    ({STATUS_EXPLANATIONS[s].label})
                  </span>
                )}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Evidence / Supporting Documents">
          <EvidenceUploader
            complianceRecordId={item.id}
            files={evidenceFiles}
            onFilesChange={handleFilesChange}
            editable={true}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsible Person">
            <input
              className={inputClass}
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
            />
          </Field>
          <Field label="Completion Date" hint="Applies when the status is Compliant">
            <input
              className={inputClass}
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              placeholder="02 Oct 2026"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includedInTender}
            onChange={(e) => setIncludedInTender(e.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
          Requirement is included in the tender / contract document
        </label>

        <Field label="Remarks">
          <textarea
            className={textareaClass}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Observation, pending action or justification…"
          />
        </Field>
      </div>
    </Modal>
  );
}

function AddRequirementModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (item: Omit<ComplianceItem, "id">) => void;
}) {
  const { documents } = useStore();
  const [requirement, setRequirement] = useState("");
  const [sourceDocId, setSourceDocId] = useState("");
  const [status, setStatus] = useState<ComplianceStatus>("Pending");
  const [dueDate, setDueDate] = useState("");
  const [responsible, setResponsible] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!requirement.trim()) e.requirement = "Requirement text is required.";
    if (!sourceDocId) e.sourceDocId = "Select the source regulation.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave({
      requirement: requirement.trim(),
      sourceDocId,
      applicable: status !== "Not Applicable",
      includedInTender: false,
      evidence: "",
      status,
      remarks: "",
      responsible,
      dueDate,
      completionDate: "",
      category: documents.find((d) => d.id === sourceDocId)?.category ?? "Procurement",
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Compliance Requirement"
      description="Requirements must reference the regulation they originate from."
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Btn>
          <Btn size="sm" onClick={submit}>
            Add requirement
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Requirement" required error={errors.requirement}>
          <textarea
            className={textareaClass}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Describe what must be followed…"
          />
        </Field>
        <Field label="Source Regulation" required error={errors.sourceDocId}>
          <select
            className={inputClass}
            value={sourceDocId}
            onChange={(e) => setSourceDocId(e.target.value)}
          >
            <option value="">Select document…</option>
            {documents
              .filter((d) => d.status === "Active")
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} — {d.title}
                </option>
              ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Initial Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplianceStatus)}
            >
              {COMPLIANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due Date">
            <input
              className={inputClass}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="10 Oct 2026"
            />
          </Field>
          <Field label="Responsible">
            <input
              className={inputClass}
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Officer name"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Modal for inline viewing of evidence files (PDFs and images).
 * Shows a preview for images, an embed for PDFs, or a download prompt for other types.
 */
function EvidenceViewerModal({
  evidence,
  onClose,
}: {
  evidence: { name: string; url: string; type: string } | null;
  onClose: () => void;
}) {
  if (!evidence) return null;

  const isImage = evidence.type.startsWith("image/");
  const isPdf = evidence.type === "application/pdf";
  const hasUrl = evidence.url && evidence.url.length > 0;

  return (
    <Modal
      open={!!evidence}
      onClose={onClose}
      wide
      title={evidence.name}
      description={`${isPdf ? "PDF" : isImage ? "Image" : "File"} evidence`}
      footer={
        <>
          {hasUrl && (
            <a
              href={evidence.url}
              download={evidence.name}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="size-3.5" /> Download
            </a>
          )}
          <Btn variant="ghost" size="sm" onClick={onClose}>
            Close
          </Btn>
        </>
      }
    >
      <div className="flex flex-col items-center justify-center gap-4">
        {hasUrl && isImage && (
          <img
            src={evidence.url}
            alt={evidence.name}
            className="max-h-[60vh] rounded-md border border-border object-contain"
          />
        )}
        {hasUrl && isPdf && (
          <iframe
            src={evidence.url}
            title={evidence.name}
            className="h-[60vh] w-full rounded-md border border-border"
          />
        )}
        {!hasUrl && (
          <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-8 py-12 text-center">
            <Eye className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">{evidence.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              File preview not available in demo mode. Connect a Supabase project to enable secure
              file viewing and downloads.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

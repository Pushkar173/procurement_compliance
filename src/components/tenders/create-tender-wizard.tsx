import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { Pill } from "@/components/common/badges";
import { Btn, Field, inputClass, Modal, textareaClass } from "@/components/common/primitives";
import { DEPARTMENTS, type Tender } from "@/data/demoData";
import { formatINR, useStore } from "@/store/app-store";

const STEPS = [
  "Basic Information",
  "Important Dates",
  "Applicable Regulations",
  "Compliance Requirements",
  "Review & Create",
];

const TENDER_TYPES = [
  "Open Tender (Goods)",
  "Open Tender (Works)",
  "Limited Tender (Services)",
  "Rate Contract",
  "Quality & Cost Based Selection",
];

interface FormState {
  id: string;
  title: string;
  department: string;
  type: string;
  value: string;
  description: string;
  issueDate: string;
  closingDate: string;
  evaluationDate: string;
  regulationIds: string[];
}

const toDisplayDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export function CreateTenderWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { documents, addTender, addCompliance, user } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    id: `TDR-2026-${Math.floor(Math.random() * 90) + 20}`,
    title: "",
    department: "",
    type: TENDER_TYPES[0] ?? "Open",
    value: "",
    description: "",
    issueDate: "",
    closingDate: "",
    evaluationDate: "",
    regulationIds: [],
  });

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  const activeDocs = useMemo(() => documents.filter((d) => d.status === "Active"), [documents]);

  const generatedRequirements = useMemo(
    () =>
      form.regulationIds.flatMap((id) => {
        const doc = documents.find((d) => d.id === id);
        return (doc?.requirements ?? []).map((r) => ({ requirement: r, sourceDocId: id, category: doc!.category }));
      }),
    [form.regulationIds, documents],
  );

  const validate = (current: number) => {
    const e: Record<string, string> = {};
    if (current === 0) {
      if (!form.id.trim()) e.id = "Tender ID is required.";
      else if (!/^TDR-\d{4}-\d{2,4}$/.test(form.id.trim()))
        e.id = "Use the format TDR-YYYY-NNN.";
      if (!form.title.trim()) e.title = "Tender title is required.";
      if (!form.department) e.department = "Select a department.";
      if (!form.value.trim()) e.value = "Estimated value is required.";
      else if (Number.isNaN(Number(form.value)) || Number(form.value) <= 0)
        e.value = "Enter the estimated value in rupees as a number.";
      if (!form.description.trim() || form.description.trim().length < 20)
        e.description = "Provide a description of at least 20 characters.";
    }
    if (current === 1) {
      if (!form.issueDate) e.issueDate = "Publication date is required.";
      if (!form.closingDate) e.closingDate = "Submission deadline is required.";
      else if (form.issueDate && form.closingDate <= form.issueDate)
        e.closingDate = "Submission deadline must be after the publication date.";
      if (!form.evaluationDate) e.evaluationDate = "Evaluation date is required.";
      else if (form.closingDate && form.evaluationDate < form.closingDate)
        e.evaluationDate = "Evaluation date cannot be before the submission deadline.";
    }
    if (current === 2 && form.regulationIds.length === 0)
      e.regulationIds = "Select at least one applicable regulation.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate(step)) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const create = () => {
    const tender: Tender = {
      id: form.id.trim().toUpperCase(),
      title: form.title.trim(),
      department: form.department,
      type: form.type,
      value: Number(form.value),
      issueDate: toDisplayDate(form.issueDate),
      closingDate: toDisplayDate(form.closingDate),
      evaluationDate: toDisplayDate(form.evaluationDate),
      status: "Draft",
      officer: user?.name ?? "Procurement Officer",
      description: form.description.trim(),
      regulationIds: form.regulationIds,
      documents: [],
      stage: "Tender Preparation",
    };
    addTender(tender);
    generatedRequirements.forEach((r) =>
      addCompliance({
        requirement: r.requirement,
        sourceDocId: r.sourceDocId,
        applicable: true,
        includedInTender: false,
        evidence: "",
        status: "Pending",
        remarks: "",
        responsible: tender.officer,
        dueDate: tender.closingDate,
        completionDate: "",
        tenderId: tender.id,
        category: r.category,
      }),
    );
    toast.success(`Tender ${tender.id} created`, {
      description: `${generatedRequirements.length} compliance requirements were generated.`,
    });
    onClose();
    setStep(0);
    navigate({ to: "/tenders/$tenderId", params: { tenderId: tender.id } });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Create Tender"
      description={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
      footer={
        <>
          <Btn variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Btn>
          {step > 0 && (
            <Btn variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="size-3.5" /> Back
            </Btn>
          )}
          {step < STEPS.length - 1 ? (
            <Btn size="sm" onClick={next}>
              Next <ChevronRight className="size-3.5" />
            </Btn>
          ) : (
            <Btn size="sm" onClick={create}>
              <Check className="size-3.5" /> Create Tender
            </Btn>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <ol className="table-scroll flex min-w-max items-center gap-2 pb-1 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 ${
                  i === step
                    ? "border-primary/30 bg-primary/10 font-medium text-primary"
                    : i < step
                      ? "border-success/25 bg-success/10 text-success"
                      : "border-border bg-muted/60 text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="size-3" /> : <span>{i + 1}</span>} {s}
              </span>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tender ID" required error={errors.id} hint="Format: TDR-YYYY-NNN">
              <input className={inputClass} value={form.id} onChange={(e) => set("id", e.target.value)} />
            </Field>
            <Field label="Tender Title" required error={errors.title}>
              <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Network Equipment Procurement" />
            </Field>
            <Field label="Department" required error={errors.department}>
              <select className={inputClass} value={form.department} onChange={(e) => set("department", e.target.value)}>
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tender Type" required>
              <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
                {TENDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated Value (₹)" required error={errors.value} hint={form.value && !Number.isNaN(Number(form.value)) ? formatINR(Number(form.value)) : "Enter the amount in rupees"}>
              <input className={inputClass} value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="25000000" inputMode="numeric" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" required error={errors.description}>
                <textarea className={textareaClass} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Scope of supply or work, delivery expectations, support period…" />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Publication Date" required error={errors.issueDate}>
              <input type="date" className={inputClass} value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </Field>
            <Field label="Submission Deadline" required error={errors.closingDate}>
              <input type="date" className={inputClass} value={form.closingDate} onChange={(e) => set("closingDate", e.target.value)} />
            </Field>
            <Field label="Evaluation Date" required error={errors.evaluationDate}>
              <input type="date" className={inputClass} value={form.evaluationDate} onChange={(e) => set("evaluationDate", e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select the regulations, guidelines and circulars that apply to this tender. Their
              requirements become the tender's compliance checklist.
            </p>
            {errors.regulationIds && (
              <p className="text-xs font-medium text-destructive">{errors.regulationIds}</p>
            )}
            <ul className="divide-y divide-border rounded-md border border-border">
              {activeDocs.map((d) => {
                const checked = form.regulationIds.includes(d.id);
                return (
                  <li key={d.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3.5 py-3 transition-colors hover:bg-accent/40">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          set(
                            "regulationIds",
                            checked
                              ? form.regulationIds.filter((x) => x !== d.id)
                              : [...form.regulationIds, d.id],
                          )
                        }
                        className="mt-0.5 size-4 accent-[var(--color-primary)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{d.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {d.id} · {d.type} · {d.authority} · {d.requirements.length} requirements
                        </span>
                      </span>
                      <Pill>{d.category}</Pill>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These requirements were generated from the selected regulations. They will be added to
              the tender's checklist with status <span className="font-medium text-foreground">Pending</span>.
            </p>
            {generatedRequirements.length === 0 ? (
              <p className="rounded-md border border-border bg-muted/40 px-3.5 py-3 text-sm text-muted-foreground">
                No requirements generated — go back and select at least one regulation.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {generatedRequirements.map((r, i) => (
                  <li key={`${r.sourceDocId}-${i}`} className="flex items-start gap-3 px-3.5 py-3">
                    <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{r.requirement}</span>
                      <span className="block text-xs text-muted-foreground">Source: {r.sourceDocId}</span>
                    </span>
                    <Pill tone="warning">Pending</Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-3 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-2">
              {[
                ["Tender ID", form.id],
                ["Title", form.title],
                ["Department", form.department],
                ["Tender Type", form.type],
                ["Estimated Value", form.value ? formatINR(Number(form.value)) : "—"],
                ["Publication Date", toDisplayDate(form.issueDate)],
                ["Submission Deadline", toDisplayDate(form.closingDate)],
                ["Evaluation Date", toDisplayDate(form.evaluationDate)],
                ["Applicable Regulations", `${form.regulationIds.length} selected`],
                ["Compliance Requirements", `${generatedRequirements.length} generated`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-muted-foreground">{form.description || "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.regulationIds.map((id) => (
                <Pill key={id} tone="primary">
                  {id}
                </Pill>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

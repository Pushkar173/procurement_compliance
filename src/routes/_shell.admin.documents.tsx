import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  CheckCircle,
  Download,
  Eye,
  FileCheck,
  FilePlus,
  FileStack,
  FileText,
  Filter,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  Field,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Select,
  StatCard,
  TableShell,
  Td,
  Th,
  inputClass,
  textareaClass,
} from "@/components/common/primitives";
import {
  AUTHORITIES,
  DOC_TYPES,
  type Authority,
  type DocumentType,
  type RegDocument,
} from "@/data/demoData";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/admin/documents")({
  head: () => ({
    meta: [
      { title: "Document Governance — ProcureComply" },
      {
        name: "description",
        content: "Administer procurement regulations, policy documents, and circular versions.",
      },
    ],
  }),
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const { documents, addDocument, updateDocument, user } = useStore();

  const [query, setQuery] = useState("");
  const [authorityFilter, setAuthorityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<RegDocument | null>(null);

  // New Document Form
  const [newDocData, setNewDocData] = useState({
    title: "",
    authority: AUTHORITIES[0] as Authority,
    type: DOC_TYPES[0] as DocumentType,
    category: "Procurement",
    year: new Date().getFullYear(),
    refNumber: "",
    summary: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    version: "v1.0",
  });

  // Version bump form
  const [versionData, setVersionData] = useState({
    version: "",
    note: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  // Edit metadata form
  const [editData, setEditData] = useState<{
    title: string;
    authority: Authority;
    type: DocumentType;
    category: string;
    summary: string;
    status: "Active" | "In Review" | "Archived" | "Superseded";
  }>({
    title: "",
    authority: AUTHORITIES[0]!,
    type: DOC_TYPES[0]!,
    category: "",
    summary: "",
    status: "Active",
  });

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (authorityFilter && d.authority !== authorityFilter) return false;
      if (typeFilter && d.type !== typeFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = [d.id, d.title, d.authority, d.type, d.category, d.refNumber, d.summary]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [documents, authorityFilter, typeFilter, statusFilter, query]);

  // Statistics
  const totalCount = documents.length;
  const financeCount = documents.filter((d) => d.authority === "Ministry of Finance").length;
  const cvcCount = documents.filter((d) => d.authority === "Central Vigilance Commission").length;
  const powerCount = documents.filter((d) => d.authority === "Ministry of Power").length;
  const activeCount = documents.filter((d) => d.status === "Active").length;

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocData.title.trim() || !newDocData.refNumber.trim()) {
      toast.error("Title and reference number are required");
      return;
    }

    const nextId = `DOC-${String(documents.length + 1).padStart(3, "0")}`;
    const newDoc: RegDocument = {
      id: nextId,
      title: newDocData.title.trim(),
      authority: newDocData.authority,
      type: newDocData.type,
      category: newDocData.category,
      year: Number(newDocData.year) || new Date().getFullYear(),
      refNumber: newDocData.refNumber.trim(),
      effectiveDate: newDocData.effectiveDate,
      version: newDocData.version.trim() || "v1.0",
      status: "Active",
      summary: newDocData.summary.trim() || "Regulatory document registered by administration.",
      description: newDocData.summary.trim() || "Regulatory document registered by administration.",
      issueDate: newDocData.effectiveDate,
      applicability: "All Public Procurement",
      stages: ["Planning", "Tender Preparation", "Evaluation", "Award"],
      requirements: [],
      relatedTenders: [],
      relatedContracts: [],
      relatedDocs: [],
      uploadedBy: user?.name ?? "Administrator",
      uploadDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      fileSize: "1.2 MB",
      pages: 14,
      tags: [newDocData.category, newDocData.type],
      history: [
        {
          version: newDocData.version.trim() || "v1.0",
          date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          note: "Initial version registered by administrator",
          by: user?.name ?? "Administrator",
        },
      ],
      mandatoryFor: ["All Tenders"],
      relatedDocIds: [],
    };

    addDocument(newDoc);
    toast.success(`Regulation ${newDoc.id} created successfully`, {
      description: newDoc.title,
    });

    setNewDocData({
      title: "",
      authority: AUTHORITIES[0]!,
      type: DOC_TYPES[0]!,
      category: "Procurement",
      year: new Date().getFullYear(),
      refNumber: "",
      summary: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      version: "v1.0",
    });
    setCreateModalOpen(false);
  };

  const openVersionModal = (doc: RegDocument) => {
    setSelectedDoc(doc);
    // suggest next version
    const parts = doc.version.replace(/^v/, "").split(".");
    const nextMinor = parts.length > 1 ? `${parts[0]}.${Number(parts[1]) + 1}` : `${parts[0]}.1`;
    setVersionData({
      version: `v${nextMinor}`,
      note: "Updated clauses and compliance obligations per latest circular",
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
    setVersionModalOpen(true);
  };

  const handleBumpVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!versionData.version.trim() || !versionData.note.trim()) {
      toast.error("Version code and revision notes are required");
      return;
    }

    updateDocument(
      selectedDoc.id,
      {
        version: versionData.version.trim(),
        effectiveDate: versionData.effectiveDate,
      },
      versionData.note.trim(),
    );

    toast.success(`Updated ${selectedDoc.id} to ${versionData.version}`);
    setVersionModalOpen(false);
    setSelectedDoc(null);
  };

  const openEditModal = (doc: RegDocument) => {
    setSelectedDoc(doc);
    setEditData({
      title: doc.title,
      authority: doc.authority,
      type: doc.type,
      category: doc.category,
      summary: doc.summary ?? doc.description ?? "",
      status: doc.status,
    });
    setEditModalOpen(true);
  };

  const handleUpdateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    updateDocument(selectedDoc.id, {
      title: editData.title.trim(),
      authority: editData.authority,
      type: editData.type,
      category: editData.category.trim(),
      summary: editData.summary.trim(),
      status: editData.status,
    });

    toast.success(`Metadata for ${selectedDoc.id} updated`);
    setEditModalOpen(false);
    setSelectedDoc(null);
  };

  const toggleArchive = (doc: RegDocument) => {
    const nextStatus = doc.status === "Archived" ? "Active" : "Archived";
    updateDocument(doc.id, { status: nextStatus }, `Status changed to ${nextStatus}`);
    toast.info(`Document ${doc.id} marked as ${nextStatus}`);
  };

  const exportCSV = () => {
    const header = "ID,Title,Authority,Type,Category,Year,RefNumber,Version,Status,EffectiveDate\n";
    const rows = filteredDocs
      .map(
        (d) =>
          `"${d.id}","${d.title.replace(/"/g, '""')}","${d.authority}","${d.type}","${d.category}","${d.year}","${d.refNumber}","${d.version}","${d.status}","${d.effectiveDate}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `procurecomply-documents-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Document register exported to CSV");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Governance & Policy Master"
        subtitle="Maintain regulatory circulars, manuals, guidelines, and compliance rules referenced across tenders and contracts."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/documents" search={{ q: "" }}>
              <Btn variant="outline" size="sm">
                <Eye className="size-4" />
                Public Register
              </Btn>
            </Link>
            <Btn variant="outline" size="sm" onClick={exportCSV}>
              <Download className="size-4" />
              Export CSV
            </Btn>
            <Btn size="sm" onClick={() => setCreateModalOpen(true)}>
              <FilePlus className="size-4" />
              Register Document
            </Btn>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Master Docs" value={totalCount} icon={FileStack} hint="Registered policies" tone="primary" />
        <StatCard label="Ministry of Finance" value={financeCount} icon={BookOpen} hint="GFR & Manuals" tone="info" />
        <StatCard label="CVC Guidelines" value={cvcCount} icon={FileCheck} hint="Vigilance mandates" tone="warning" />
        <StatCard label="Ministry of Power" value={powerCount} icon={Layers} hint="Sector regulations" tone="caution" />
        <StatCard label="Active in Force" value={`${activeCount}/${totalCount}`} icon={CheckCircle} hint="Applicable policies" tone="success" />
      </div>

      {/* Filter and Search Bar */}
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            placeholder="Search by title, ref no., keyword..."
            value={query}
            onChange={setQuery}
          />
          <Select
            label="Authority"
            value={authorityFilter}
            options={AUTHORITIES}
            onChange={setAuthorityFilter}
            allLabel="All authorities"
          />
          <Select
            label="Document Type"
            value={typeFilter}
            options={DOC_TYPES}
            onChange={setTypeFilter}
            allLabel="All types"
          />
          <Select
            label="Status"
            value={statusFilter}
            options={["Active", "In Review", "Archived"]}
            onChange={setStatusFilter}
            allLabel="All statuses"
          />
        </div>
      </Panel>

      {/* Document Master Table */}
      <Panel
        title={`Registered Policy Documents (${filteredDocs.length} of ${documents.length})`}
        description="Comprehensive list of procurement manuals, circulars, and vigilance orders in the knowledge base."
      >
        <TableShell
          head={
            <>
              <Th>Document Code & Title</Th>
              <Th>Issuing Authority & Type</Th>
              <Th>Ref. Number & Year</Th>
              <Th>Version</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </>
          }
        >
          {filteredDocs.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                No documents match your filter criteria.
              </td>
            </tr>
          ) : (
            filteredDocs.map((doc) => {
              return (
                <tr key={doc.id} className="hover:bg-muted/40 transition-colors">
                  <Td>
                    <div className="max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">{doc.id}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {doc.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-foreground line-clamp-1">{doc.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{doc.summary}</p>
                    </div>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.authority}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-medium text-foreground truncate">{doc.refNumber}</p>
                      <p className="text-xs text-muted-foreground">Year {doc.year}</p>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        {doc.version}
                      </span>
                      {doc.history && doc.history.length > 1 && (
                        <span className="text-[10px] text-muted-foreground" title={`${doc.history.length} revisions logged`}>
                          ({doc.history.length} rev)
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        doc.status === "Active"
                          ? "bg-success/15 text-success"
                          : doc.status === "In Review"
                          ? "bg-warning/20 text-warning-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          doc.status === "Active"
                            ? "bg-success"
                            : doc.status === "In Review"
                            ? "bg-warning"
                            : "bg-muted-foreground"
                        }`}
                      />
                      {doc.status}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Btn
                        variant="outline"
                        size="sm"
                        onClick={() => openVersionModal(doc)}
                        title="Bump version and record amendment note"
                      >
                        <RefreshCw className="size-3.5" />
                        <span className="hidden sm:inline">New Rev</span>
                      </Btn>
                      <Btn
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(doc)}
                        title="Edit metadata"
                      >
                        Edit
                      </Btn>
                      <Btn
                        variant={doc.status === "Archived" ? "subtle" : "ghost"}
                        size="sm"
                        onClick={() => toggleArchive(doc)}
                        className={doc.status !== "Archived" ? "text-muted-foreground hover:text-destructive" : ""}
                        title={doc.status === "Archived" ? "Activate document" : "Archive document"}
                      >
                        <Archive className="size-3.5" />
                      </Btn>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </TableShell>
      </Panel>

      {/* Create Document Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register Regulatory Document"
        description="Add a new government policy, circular, or manual to the compliance repository."
        wide
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleCreateDoc}>Register Document</Btn>
          </div>
        }
      >
        <form onSubmit={handleCreateDoc} className="space-y-4">
          <Field label="Document Official Title" required>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Manual for Procurement of Goods 2026"
              value={newDocData.title}
              onChange={(e) => setNewDocData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Issuing Authority" required>
              <select
                className={inputClass}
                value={newDocData.authority}
                onChange={(e) =>
                  setNewDocData((prev) => ({ ...prev, authority: e.target.value as Authority }))
                }
              >
                {AUTHORITIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Document Classification" required>
              <select
                className={inputClass}
                value={newDocData.type}
                onChange={(e) =>
                  setNewDocData((prev) => ({ ...prev, type: e.target.value as DocumentType }))
                }
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Reference / Circular Number" required>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. F.1/26/2026-PPD"
                value={newDocData.refNumber}
                onChange={(e) => setNewDocData((prev) => ({ ...prev, refNumber: e.target.value }))}
                required
              />
            </Field>

            <Field label="Category / Focus Area">
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Procurement, Vigilance"
                value={newDocData.category}
                onChange={(e) => setNewDocData((prev) => ({ ...prev, category: e.target.value }))}
              />
            </Field>

            <Field label="Initial Version Code">
              <input
                type="text"
                className={inputClass}
                value={newDocData.version}
                onChange={(e) => setNewDocData((prev) => ({ ...prev, version: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Summary & Regulatory Scope">
            <textarea
              className={textareaClass}
              placeholder="Summarize the core requirements, mandatory thresholds, and applicability..."
              value={newDocData.summary}
              onChange={(e) => setNewDocData((prev) => ({ ...prev, summary: e.target.value }))}
              rows={3}
            />
          </Field>
        </form>
      </Modal>

      {/* Bump Version Modal */}
      <Modal
        open={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        title={`Register Revision for ${selectedDoc?.id}`}
        description="Publish a revised version with circular amendment notes and updated effective date."
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setVersionModalOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleBumpVersion}>Record Revision</Btn>
          </div>
        }
      >
        <form onSubmit={handleBumpVersion} className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <p className="font-semibold text-foreground">{selectedDoc?.title}</p>
            <p className="text-muted-foreground">Current Version: {selectedDoc?.version}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New Version Tag" required>
              <input
                type="text"
                className={inputClass}
                value={versionData.version}
                onChange={(e) => setVersionData((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="e.g. v2.1"
                required
              />
            </Field>

            <Field label="Effective Date">
              <input
                type="date"
                className={inputClass}
                value={versionData.effectiveDate}
                onChange={(e) => setVersionData((prev) => ({ ...prev, effectiveDate: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Revision Summary / Amendment Notes" required>
            <textarea
              className={textareaClass}
              value={versionData.note}
              onChange={(e) => setVersionData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Describe the clauses revised, updated thresholds, or circular references..."
              rows={3}
              required
            />
          </Field>
        </form>
      </Modal>

      {/* Edit Metadata Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Document: ${selectedDoc?.id}`}
        description="Modify metadata, authority classification, and active status."
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleUpdateDoc}>Save Changes</Btn>
          </div>
        }
      >
        <form onSubmit={handleUpdateDoc} className="space-y-4">
          <Field label="Title" required>
            <input
              type="text"
              className={inputClass}
              value={editData.title}
              onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Authority" required>
              <select
                className={inputClass}
                value={editData.authority}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, authority: e.target.value as Authority }))
                }
              >
                {AUTHORITIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" required>
              <select
                className={inputClass}
                value={editData.status}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    status: e.target.value as "Active" | "In Review" | "Archived",
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="In Review">In Review</option>
                <option value="Archived">Archived</option>
              </select>
            </Field>
          </div>

          <Field label="Summary">
            <textarea
              className={textareaClass}
              value={editData.summary}
              onChange={(e) => setEditData((prev) => ({ ...prev, summary: e.target.value }))}
              rows={3}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

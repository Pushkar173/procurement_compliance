import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Bookmark,
  Download,
  Eye,
  FileSearch,
  History,
  Link2,
  RotateCcw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DocStatusBadge, Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  KeyValue,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Select,
  TableShell,
  Td,
  Th,
} from "@/components/common/primitives";
import { AUTHORITIES, CATEGORIES, DOC_TYPES, type RegDocument } from "@/data/demoData";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/documents")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  head: () => ({
    meta: [
      { title: "Regulations & Documents — ProcureComply" },
      {
        name: "description",
        content:
          "Searchable repository of procurement regulations, policies, guidelines, circulars, manuals and office memorandums with metadata and version history.",
      },
      { property: "og:title", content: "Regulations & Documents — ProcureComply" },
      {
        property: "og:description",
        content: "Search and filter procurement regulations and official documents in one place.",
      },
    ],
  }),
  loader: async () => {
    return { dbDocuments: [], dbTenders: [] };
  },
  component: DocumentsPage,
});

function DocumentsPage() {
  const { dbDocuments } = Route.useLoaderData();
  const { documents: storeDocuments, tenders, linkRegulation, can, user } = useStore();
  const role = user?.role;
  const documents = dbDocuments.length > 0 ? dbDocuments : storeDocuments;

  const { q } = Route.useSearch();
  const navigate = useNavigate();

  const [query, setQuery] = useState(q);
  const [authority, setAuthority] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<RegDocument | null>(null);
  const [linkTarget, setLinkTarget] = useState("");

  const years = useMemo(
    () =>
      Array.from(new Set(documents.map((d) => String(d.year))))
        .sort()
        .reverse(),
    [documents],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return documents.filter((d) => {
      const haystack = [
        d.id,
        d.title,
        d.authority,
        d.type,
        d.category,
        d.description,
        d.applicability,
        ...d.requirements,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!term || haystack.includes(term)) &&
        (!authority || d.authority === authority) &&
        (!type || d.type === type) &&
        (!category || d.category === category) &&
        (!year || String(d.year) === year) &&
        (!status || d.status === status)
      );
    });
  }, [documents, query, authority, type, category, year, status]);

  const activeFilters =
    [authority, type, category, year, status].filter(Boolean).length + (query ? 1 : 0);

  const clearAll = () => {
    setQuery("");
    setAuthority("");
    setType("");
    setCategory("");
    setYear("");
    setStatus("");
    navigate({ to: "/documents", search: { q: "" } });
  };

  const related = selected ? documents.filter((d) => selected.relatedDocs.includes(d.id)) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulations & Documents"
        subtitle="Access procurement-related regulations, policies, guidelines and official documents in one place."
        actions={
          <>
            <Pill tone="primary">{documents.length} records</Pill>
            <Btn
              variant="outline"
              size="sm"
              onClick={() =>
                toast.info("Export is a demo action", {
                  description: "A CSV of the filtered repository would be downloaded.",
                })
              }
            >
              <Download className="size-4" /> Export
            </Btn>
          </>
        }
      />

      <DemoNotice />

      <Panel bodyClassName="space-y-4 p-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search regulations, circulars, guidelines…"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Issuing Authority"
            value={authority}
            options={AUTHORITIES}
            onChange={setAuthority}
            allLabel="All authorities"
          />
          <Select
            label="Document Type"
            value={type}
            options={DOC_TYPES}
            onChange={setType}
            allLabel="All types"
          />
          <Select
            label="Category"
            value={category}
            options={CATEGORIES}
            onChange={setCategory}
            allLabel="All categories"
          />
          <Select
            label="Year"
            value={year}
            options={years}
            onChange={setYear}
            allLabel="All years"
          />
          <Select
            label="Status"
            value={status}
            options={["Active", "Superseded", "Archived"]}
            onChange={setStatus}
            allLabel="All statuses"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            {documents.length} documents
            {activeFilters > 0 &&
              ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} applied`}
          </p>
          <Btn variant="ghost" size="sm" onClick={clearAll} disabled={activeFilters === 0}>
            <RotateCcw className="size-3.5" /> Clear filters
          </Btn>
        </div>
      </Panel>

      <Panel title="Document Repository" bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No matching documents found."
            description="Try a different search term or clear the filters."
            action={
              <Btn variant="outline" size="sm" onClick={clearAll}>
                Clear filters
              </Btn>
            }
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>Document ID</Th>
                <Th>Document Title</Th>
                <Th>Issuing Authority</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {filtered.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-accent/40">
                <Td className="font-mono text-xs font-medium">{d.id}</Td>
                <Td>
                  <button
                    onClick={() => setSelected(d)}
                    className="text-left text-sm font-medium hover:text-primary hover:underline"
                  >
                    {d.title}
                  </button>
                  <p className="text-xs text-muted-foreground">v{d.version}</p>
                </Td>
                <Td className="text-sm text-muted-foreground">{d.authority}</Td>
                <Td>
                  <Pill>{d.type}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-sm text-muted-foreground">{d.issueDate}</Td>
                <Td className="text-sm text-muted-foreground">{d.category}</Td>
                <Td>
                  <DocStatusBadge status={d.status} />
                </Td>
                <Td className="text-right">
                  <Btn size="sm" variant="outline" onClick={() => setSelected(d)}>
                    <Eye className="size-3.5" /> View
                  </Btn>
                </Td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setLinkTarget("");
        }}
        wide
        title={selected?.title ?? ""}
        description={
          selected ? `${selected.id} · Version ${selected.version} · ${selected.status}` : ""
        }
        footer={
          <>
            <Btn
              variant="outline"
              size="sm"
              onClick={() =>
                toast.info("Document viewer is a demo action", {
                  description: "The stored PDF would open in a viewer.",
                })
              }
            >
              <Eye className="size-3.5" /> View Document
            </Btn>
            <Btn
              variant="outline"
              size="sm"
              onClick={() =>
                toast.info("Download is a demo action", {
                  description: `${selected?.id} would be downloaded.`,
                })
              }
            >
              <Download className="size-3.5" /> Download
            </Btn>
            <Btn
              variant="outline"
              size="sm"
              onClick={() =>
                toast.success("Marked as reference", {
                  description: `${selected?.id} saved to your reference list.`,
                })
              }
            >
              <Bookmark className="size-3.5" /> Mark as Reference
            </Btn>
          </>
        }
      >
        {selected && (
          <div className="space-y-6">
            <KeyValue
              items={[
                { label: "Document ID", value: selected.id },
                { label: "Issuing Authority", value: selected.authority },
                { label: "Document Type", value: selected.type },
                { label: "Category", value: selected.category },
                { label: "Issue Date", value: selected.issueDate },
                { label: "Effective Date", value: selected.effectiveDate },
                { label: "Version", value: `v${selected.version}` },
                { label: "Status", value: <DocStatusBadge status={selected.status} /> },
                { label: "Uploaded By", value: selected.uploadedBy },
                { label: "Upload Date", value: selected.uploadDate },
              ]}
            />

            <div>
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{selected.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Applicability</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{selected.applicability}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Related Procurement Stages</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.stages.map((s) => (
                  <Pill key={s} tone="info">
                    {s}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">
                Compliance Requirements Derived from this Document
              </h3>
              <ul className="mt-2 space-y-1.5">
                {selected.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Link2 className="size-4" /> Add to Tender
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Linking a regulation to a tender makes its requirements part of that tender's
                compliance checklist.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="flex min-w-56 flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Select tender</span>
                  <select
                    value={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.value)}
                    className="h-10 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                  >
                    <option value="">Choose a tender…</option>
                    {tenders.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id} — {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Btn
                  size="md"
                  disabled={!linkTarget || !can("edit")}
                  onClick={() => {
                    linkRegulation(linkTarget, selected.id);
                    toast.success("Regulation linked", {
                      description: `${selected.id} is now applicable to ${linkTarget}.`,
                    });
                    setLinkTarget("");
                  }}
                >
                  Add to Tender
                </Btn>
              </div>
              {!can("edit") && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Your role has read-only access to procurement records.
                </p>
              )}
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <History className="size-4" /> Version History
              </h3>
              <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                {selected.history.map((h, i) => (
                  <li
                    key={`${h.version}-${i}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
                  >
                    <Pill tone={h.version === selected.version ? "success" : "neutral"}>
                      v{h.version}
                    </Pill>
                    <span className="text-muted-foreground">{h.date}</span>
                    <span className="min-w-0 flex-1 truncate">{h.note}</span>
                    <span className="text-xs text-muted-foreground">{h.by}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Currently active version:{" "}
                <span className="font-medium text-foreground">v{selected.version}</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold">Related Tenders</h3>
                {selected.relatedTenders.length === 0 ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">No linked tenders.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selected.relatedTenders.map((t) => (
                      <li key={t}>
                        <Link
                          to="/tenders/$tenderId"
                          params={{ tenderId: t }}
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => setSelected(null)}
                        >
                          {t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold">Related Contracts</h3>
                {selected.relatedContracts.length === 0 ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">No linked contracts.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {selected.relatedContracts.map((c) => (
                      <li key={c}>
                        <Link
                          to="/contracts/$contractId"
                          params={{ contractId: c }}
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => setSelected(null)}
                        >
                          {c}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <BookOpen className="size-4" /> Related Documents
              </h3>
              {related.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  No related documents recorded.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                  {related.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.id} · {r.type} · {r.authority}
                        </p>
                      </div>
                      <Btn size="sm" variant="ghost" onClick={() => setSelected(r)}>
                        Open
                      </Btn>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

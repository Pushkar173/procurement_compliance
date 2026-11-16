import { supabase } from "../supabase";
import type { Database } from "../database.types";
import type { RegDocument } from "@/data/demoData";

export type RegulatoryDocumentRow = Database["public"]["Tables"]["regulatory_documents"]["Row"];

export async function listRegulatoryDocuments(): Promise<RegDocument[]> {
  const { data, error } = await supabase
    .from("regulatory_documents")
    .select("*")
    .order("effective_date", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbDocument);
}

export async function searchDocuments(query: string): Promise<RegDocument[]> {
  const { data, error } = await supabase
    .from("regulatory_documents")
    .select("*")
    .or(`title.ilike.%${query}%,ref_number.ilike.%${query}%,summary.ilike.%${query}%`);

  if (error) throw error;
  return (data || []).map(mapDbDocument);
}

function mapDbDocument(db: RegulatoryDocumentRow): RegDocument {
  return {
    id: db.ref_number || db.id,
    title: db.title,
    authority: (db.issuing_authority as RegDocument["authority"]) || "Other Authorities",
    type: "Regulation",
    category: db.category,
    year: db.effective_date ? new Date(db.effective_date).getFullYear() : 2026,
    issueDate: db.effective_date ? new Date(db.effective_date).toLocaleDateString() : "",
    effectiveDate: db.effective_date ? new Date(db.effective_date).toLocaleDateString() : "",
    version: "1.0",
    status: "Active",
    description: db.summary || "",
    summary: db.summary || "",
    applicability: "",
    requirements: [],
    stages: [],
    uploadedBy: "System",
    uploadDate: db.created_at ? new Date(db.created_at).toLocaleDateString() : "",
    relatedDocs: [],
    relatedTenders: [],
    relatedContracts: [],
    history: [],
  };
}

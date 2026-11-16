import { supabase } from "../supabase";
import type { RegDocument } from "@/data/demoData";

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

function mapDbDocument(db: any): RegDocument {
  return {
    id: db.ref_number || db.id,
    title: db.title,
    authority: db.issuing_authority,
    type: "Regulation",
    issueDate: db.effective_date ? new Date(db.effective_date).toLocaleDateString() : "",
    effectiveDate: db.effective_date ? new Date(db.effective_date).toLocaleDateString() : "",
    version: "1.0",
    status: "Active",
    category: db.category,
    description: db.summary,
    applicability: "",
    requirements: [],
    stages: [],
    uploadedBy: "System",
    uploadDate: db.created_at ? new Date(db.created_at).toLocaleDateString() : "",
    relatedDocs: [],
    relatedTenders: [],
    relatedContracts: [],
    history: [],
  } as unknown as RegDocument;
}

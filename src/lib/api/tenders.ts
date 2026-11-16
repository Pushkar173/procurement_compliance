import { supabase } from "../supabase";
import type { Tender } from "@/data/demoData";

export async function listTenders(): Promise<Tender[]> {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbTenderToTender);
}

export async function getTenderById(id: string): Promise<Tender> {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapDbTenderToTender(data);
}

export async function createTender(tender: any) {
  const { data, error } = await supabase
    .from("tenders")
    .insert(tender)
    .select()
    .single();

  if (error) throw error;
  return mapDbTenderToTender(data);
}

export async function updateTenderStatus(id: string, status: string) {
  const { data, error } = await (supabase
    .from("tenders") as any)
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapDbTenderToTender(data);
}

// Temporary mapper to bridge DB schema and demoData frontend type
function mapDbTenderToTender(db: any): Tender {
  return {
    id: db.tender_id || db.id,
    title: db.title,
    category: db.category,
    type: db.procurement_method || "Open",
    department: db.department,
    value: Number(db.estimated_value),
    issueDate: db.created_at ? new Date(db.created_at).toLocaleDateString() : "",
    closingDate: db.deadline ? new Date(db.deadline).toLocaleDateString() : "",
    evaluationDate: "", // missing in db
    status: db.status,
    stage: "Preparation", 
    description: db.title,
    regulationIds: [], // array in db?
    documents: [],
    officer: db.created_by,
  } as Tender;
}

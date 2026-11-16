import { supabase } from "../supabase";
import type { Database } from "../database.types";
import type { Tender, TenderStatus } from "@/data/demoData";

export type TenderRow = Database["public"]["Tables"]["tenders"]["Row"];
export type TenderInsert = Database["public"]["Tables"]["tenders"]["Insert"];
export type TenderUpdate = Database["public"]["Tables"]["tenders"]["Update"];

export async function listTenders(): Promise<Tender[]> {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbTenderToTender);
}

export async function getTenderById(id: string): Promise<Tender> {
  const { data, error } = await supabase.from("tenders").select("*").eq("id", id).single();

  if (error) throw error;
  return mapDbTenderToTender(data);
}

export async function createTender(tender: TenderInsert): Promise<Tender> {
  const { data, error } = await supabase.from("tenders").insert(tender).select().single();

  if (error) throw error;
  return mapDbTenderToTender(data);
}

export async function updateTenderStatus(id: string, status: string): Promise<Tender> {
  const { data, error } = await supabase
    .from("tenders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapDbTenderToTender(data);
}

// Temporary mapper to bridge DB schema and demoData frontend type
function mapDbTenderToTender(db: TenderRow): Tender {
  return {
    id: db.tender_id || db.id,
    title: db.title,
    department: db.department || "",
    type: db.procurement_method || "Open",
    value: Number(db.estimated_value || 0),
    issueDate: db.created_at ? new Date(db.created_at).toLocaleDateString() : "",
    closingDate: db.deadline ? new Date(db.deadline).toLocaleDateString() : "",
    evaluationDate: "", // missing in db
    status: (db.status as TenderStatus) || "Draft",
    stage: "Preparation",
    description: db.title,
    regulationIds: [], // array in db?
    documents: [],
    officer: db.created_by || "",
  };
}

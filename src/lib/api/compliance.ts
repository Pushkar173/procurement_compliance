import { supabase } from "../supabase";
import type { ComplianceItem } from "@/data/demoData";

export async function getComplianceChecklist(filter?: { tender_id?: string; contract_id?: string }): Promise<ComplianceItem[]> {
  let query = supabase.from("compliance_records").select("*");
  
  if (filter?.tender_id) {
    query = query.eq("tender_id", filter.tender_id);
  }
  if (filter?.contract_id) {
    query = query.eq("contract_id", filter.contract_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapDbCompliance);
}

export async function updateComplianceRecord(id: string, updates: any) {
  const { data, error } = await (supabase
    .from("compliance_records") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapDbCompliance(data);
}

function mapDbCompliance(db: any): ComplianceItem {
  return {
    id: db.id,
    tenderId: db.tender_id,
    contractId: db.contract_id,
    sourceDocId: db.document_id,
    requirement: db.requirement,
    status: db.status,
    applicable: db.is_applicable ?? true,
    includedInTender: false,
    evidence: db.evidence_url,
    remarks: db.remarks,
    responsible: db.verified_by,
    dueDate: "",
    completionDate: db.verified_at ? new Date(db.verified_at).toLocaleDateString() : "",
    category: "Procurement",
  } as ComplianceItem;
}

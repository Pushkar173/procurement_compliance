import { supabase } from "../supabase";
import type { Database } from "../database.types";
import type { Contract } from "@/data/demoData";

export type ContractRow = Database["public"]["Tables"]["contracts"]["Row"];
export type ContractInsert = Database["public"]["Tables"]["contracts"]["Insert"];
export type ContractUpdate = Database["public"]["Tables"]["contracts"]["Update"];

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbContractToContract);
}

export async function getContractById(id: string): Promise<Contract> {
  const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();

  if (error) throw error;
  return mapDbContractToContract(data);
}

export async function createContract(contract: ContractInsert): Promise<Contract> {
  const { data, error } = await supabase.from("contracts").insert(contract).select().single();

  if (error) throw error;
  return mapDbContractToContract(data);
}

export async function updateContractStatus(id: string, status: string): Promise<Contract> {
  const { data, error } = await supabase
    .from("contracts")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapDbContractToContract(data);
}

function mapDbContractToContract(db: ContractRow): Contract {
  return {
    id: db.contract_ref || db.id,
    tenderId: db.tender_id ?? "",
    name: "Contract",
    vendor: db.supplier_name,
    vendorContact: { person: "", email: "", phone: "", address: "" },
    value: Number(db.agreed_value ?? db.contract_value ?? 0),
    department: "",
    startDate: db.start_date ? new Date(db.start_date).toLocaleDateString() : "",
    endDate: db.end_date ? new Date(db.end_date).toLocaleDateString() : "",
    renewalDate: "",
    manager: "",
    status: (db.status as Contract["status"]) || "Active",
    paymentStatus: "On Schedule",
    milestones: [],
    documents: [],
  };
}

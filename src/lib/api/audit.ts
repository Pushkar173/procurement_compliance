import { supabase } from "../supabase";
import type { AuditEvent } from "@/data/demoData";

export async function logAuditEvent(event: any) {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return mapDbAudit(data);
}

export async function listAuditLogs(limit = 100): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapDbAudit);
}

function mapDbAudit(db: any): AuditEvent {
  const d = new Date(db.created_at);
  return {
    id: db.id,
    action: db.action,
    object: db.entity_id || "Unknown Entity",
    objectType: db.entity_type || "Other",
    user: db.user_id,
    role: "Officer",
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    previous: db.old_values ? JSON.stringify(db.old_values) : undefined,
    next: db.new_values ? JSON.stringify(db.new_values) : undefined,
  } as unknown as AuditEvent;
}

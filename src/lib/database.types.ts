export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: "admin" | "officer" | "auditor";
          created_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "admin" | "officer" | "auditor";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "admin" | "officer" | "auditor";
          created_at?: string;
        };
        Relationships: [];
      };
      regulatory_documents: {
        Row: {
          id: string;
          title: string;
          ref_number: string;
          category: string;
          issuing_authority: string;
          effective_date: string | null;
          summary: string | null;
          document_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          ref_number: string;
          category: string;
          issuing_authority: string;
          effective_date?: string | null;
          summary?: string | null;
          document_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          ref_number?: string;
          category?: string;
          issuing_authority?: string;
          effective_date?: string | null;
          summary?: string | null;
          document_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tenders: {
        Row: {
          id: string;
          tender_id: string;
          title: string;
          category: string | null;
          procurement_method: string | null;
          estimated_value: number | null;
          currency: string;
          status: string;
          department: string | null;
          deadline: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tender_id: string;
          title: string;
          category?: string | null;
          procurement_method?: string | null;
          estimated_value?: number | null;
          currency?: string;
          status?: string;
          department?: string | null;
          deadline?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tender_id?: string;
          title?: string;
          category?: string | null;
          procurement_method?: string | null;
          estimated_value?: number | null;
          currency?: string;
          status?: string;
          department?: string | null;
          deadline?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          contract_ref: string;
          tender_id: string | null;
          supplier_name: string;
          agreed_value: number | null;
          contract_value?: number | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          performance_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_ref: string;
          tender_id?: string | null;
          supplier_name: string;
          agreed_value?: number | null;
          contract_value?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          performance_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_ref?: string;
          tender_id?: string | null;
          supplier_name?: string;
          agreed_value?: number | null;
          contract_value?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
          performance_score?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      compliance_requirements: {
        Row: {
          id: string;
          title: string;
          document_ref: string;
          clause: string | null;
          category: string;
          is_mandatory: boolean;
          threshold_condition: Json | null;
        };
        Insert: {
          id?: string;
          title: string;
          document_ref: string;
          clause?: string | null;
          category?: string;
          is_mandatory?: boolean;
          threshold_condition?: Json | null;
        };
        Update: {
          id?: string;
          title?: string;
          document_ref?: string;
          clause?: string | null;
          category?: string;
          is_mandatory?: boolean;
          threshold_condition?: Json | null;
        };
        Relationships: [];
      };
      compliance_records: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          requirement_id?: string;
          status: Database["public"]["Enums"]["compliance_status"];
          justification: string | null;
          verified_by: string | null;
          verified_at: string | null;
          evidence_urls: string[];
          updated_at?: string;
          tender_id?: string | null;
          contract_id?: string | null;
          document_id?: string | null;
          requirement?: string | null;
          is_applicable?: boolean | null;
          evidence_url?: string | null;
          remarks?: string | null;
        };
        Insert: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          requirement_id?: string;
          status?: Database["public"]["Enums"]["compliance_status"];
          justification?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          evidence_urls?: string[];
          updated_at?: string;
          tender_id?: string | null;
          contract_id?: string | null;
          document_id?: string | null;
          requirement?: string | null;
          is_applicable?: boolean | null;
          evidence_url?: string | null;
          remarks?: string | null;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          requirement_id?: string;
          status?: Database["public"]["Enums"]["compliance_status"];
          justification?: string | null;
          verified_by?: string | null;
          verified_at?: string | null;
          evidence_urls?: string[];
          updated_at?: string;
          tender_id?: string | null;
          contract_id?: string | null;
          document_id?: string | null;
          requirement?: string | null;
          is_applicable?: boolean | null;
          evidence_url?: string | null;
          remarks?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Json | null;
          created_at: string;
          user_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json | null;
          created_at?: string;
          user_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json | null;
          created_at?: string;
          user_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          target_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          target_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          is_read?: boolean;
          target_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: { user_id: string; required_role: "admin" | "officer" | "auditor" };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "officer" | "auditor";
      compliance_status:
        "Pending" | "Compliant" | "Partially Compliant" | "Non-Compliant" | "Not Applicable";
    };
  };
}

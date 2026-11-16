-- =============================================================================
-- ProcureComply — Initial Database Schema & Seed Data
-- Migration: 20261004000000_initial_schema.sql
--
-- Sections:
--   0.  Prerequisites (pgcrypto extension)
--   1.  Custom Types (ENUMs)
--   2.  Table Definitions
--   3.  Indexes
--   4.  Row-Level Security (RLS) — helper function + policies
--   5.  Seed Data  (regulatory_documents · tenders · contracts ·
--                   compliance_requirements · compliance_records)
--
-- Run against: Supabase / vanilla PostgreSQL ≥ 14
-- Author:      Generated from src/data/demoData.ts
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 0.  PREREQUISITES
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable pgcrypto so gen_random_uuid() is available on PostgreSQL < 15
-- (Supabase enables this by default; harmless if already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  CUSTOM TYPES
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Role enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'officer', 'auditor');
  END IF;

  -- Compliance status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_status') THEN
    CREATE TYPE compliance_status AS ENUM (
      'compliant',
      'non_compliant',
      'under_review',
      'pending'
    );
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  TABLE DEFINITIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- 2.1  user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role       app_role    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);

COMMENT ON TABLE  public.user_roles          IS 'Maps Supabase auth users to one or more application roles.';
COMMENT ON COLUMN public.user_roles.user_id  IS 'References auth.users.id — the authenticated principal.';
COMMENT ON COLUMN public.user_roles.role     IS 'Application role: admin | officer | auditor.';


-- ---------------------------------------------------------------------------
-- 2.2  regulatory_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regulatory_documents (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT        NOT NULL,
  ref_number        TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  issuing_authority TEXT        NOT NULL,
  effective_date    DATE,
  summary           TEXT,
  document_url      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT regulatory_documents_ref_number_unique UNIQUE (ref_number)
);

COMMENT ON TABLE  public.regulatory_documents                   IS 'Master repository of regulatory documents, policies, circulars and guidelines.';
COMMENT ON COLUMN public.regulatory_documents.ref_number        IS 'Human-readable identifier (e.g. DOC-001). Must be unique.';
COMMENT ON COLUMN public.regulatory_documents.category          IS 'Free-text category: Procurement | Contract | Finance | Vigilance | Quality | Records | Safety.';
COMMENT ON COLUMN public.regulatory_documents.issuing_authority IS 'e.g. Ministry of Finance, Central Vigilance Commission.';


-- ---------------------------------------------------------------------------
-- 2.3  tenders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenders (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id          TEXT        NOT NULL,
  title              TEXT        NOT NULL,
  category           TEXT,
  procurement_method TEXT,
  estimated_value    NUMERIC(18, 2),
  currency           TEXT        NOT NULL DEFAULT 'INR',
  status             TEXT        NOT NULL DEFAULT 'Draft',
  department         TEXT,
  deadline           TIMESTAMPTZ,
  created_by         UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenders_tender_id_unique UNIQUE (tender_id)
);

COMMENT ON TABLE  public.tenders                    IS 'Procurement tender records across all departments.';
COMMENT ON COLUMN public.tenders.tender_id          IS 'Business key (e.g. TDR-2026-014). Must be unique.';
COMMENT ON COLUMN public.tenders.procurement_method IS 'Open Tender | Limited Tender | Rate Contract | QCBS etc.';
COMMENT ON COLUMN public.tenders.status             IS 'Draft | Under Review | Published | Evaluation | Awarded | Closed.';
COMMENT ON COLUMN public.tenders.deadline           IS 'Bid closing / submission deadline.';


-- ---------------------------------------------------------------------------
-- 2.4  contracts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_ref      TEXT        NOT NULL,
  tender_id         UUID        REFERENCES public.tenders (id) ON DELETE SET NULL,
  supplier_name     TEXT        NOT NULL,
  agreed_value      NUMERIC(18, 2),
  start_date        DATE,
  end_date          DATE,
  status            TEXT        NOT NULL DEFAULT 'Active',
  performance_score NUMERIC(5, 2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT contracts_contract_ref_unique UNIQUE (contract_ref)
);

COMMENT ON TABLE  public.contracts                   IS 'Executed contracts derived from awarded tenders.';
COMMENT ON COLUMN public.contracts.contract_ref      IS 'Business key (e.g. CON-2026-008). Must be unique.';
COMMENT ON COLUMN public.contracts.status            IS 'Active | Expiring Soon | Completed | Terminated.';
COMMENT ON COLUMN public.contracts.performance_score IS 'Vendor performance score 0-100 (populated at milestone reviews).';


-- ---------------------------------------------------------------------------
-- 2.5  compliance_requirements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_requirements (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT    NOT NULL,
  document_ref        TEXT    NOT NULL,
  clause              TEXT,
  category            TEXT    NOT NULL DEFAULT 'Procurement',
  is_mandatory        BOOLEAN NOT NULL DEFAULT true,
  threshold_condition JSONB,

  CONSTRAINT compliance_requirements_title_doc_unique UNIQUE (title, document_ref)
);

COMMENT ON TABLE  public.compliance_requirements                     IS 'Individual compliance requirements extracted from regulatory documents.';
COMMENT ON COLUMN public.compliance_requirements.document_ref        IS 'The ref_number of the source regulatory document (e.g. DOC-001).';
COMMENT ON COLUMN public.compliance_requirements.threshold_condition IS 'Optional JSONB: {"field":"estimated_value","operator":">=","value":500000}.';


-- ---------------------------------------------------------------------------
-- 2.6  compliance_records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_records (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT              NOT NULL CHECK (entity_type IN ('tender', 'contract')),
  entity_id      UUID              NOT NULL,
  requirement_id UUID              NOT NULL REFERENCES public.compliance_requirements (id) ON DELETE CASCADE,
  status         compliance_status NOT NULL DEFAULT 'pending',
  justification  TEXT,
  verified_by    UUID              REFERENCES auth.users (id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  evidence_urls  TEXT[]            NOT NULL DEFAULT '{}',
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.compliance_records               IS 'Per-entity compliance status for each requirement (tender or contract).';
COMMENT ON COLUMN public.compliance_records.entity_type   IS '"tender" or "contract" — determines which table entity_id points to.';
COMMENT ON COLUMN public.compliance_records.entity_id     IS 'UUID of the tender or contract (polymorphic FK).';
COMMENT ON COLUMN public.compliance_records.evidence_urls IS 'Array of URLs or file paths to supporting evidence.';


-- ---------------------------------------------------------------------------
-- 2.7  audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_name  TEXT        NOT NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.audit_logs             IS 'Immutable append-only audit trail of all significant system events.';
COMMENT ON COLUMN public.audit_logs.action      IS 'e.g. CREATED | UPDATED | DELETED | SUBMITTED | APPROVED | LOGIN.';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'High-level entity type: Tender | Contract | Document | Compliance | User | Session.';
COMMENT ON COLUMN public.audit_logs.details     IS 'Freeform JSONB payload capturing before/after state or event metadata.';


-- ---------------------------------------------------------------------------
-- 2.8  notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  target_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notifications            IS 'Per-user in-app notifications.';
COMMENT ON COLUMN public.notifications.type       IS 'info | warning | success | document — controls icon/colour in the UI.';
COMMENT ON COLUMN public.notifications.target_url IS 'Optional deep-link URL the notification should navigate to.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id  ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role     ON public.user_roles (role);

-- regulatory_documents
CREATE INDEX IF NOT EXISTS idx_reg_docs_category   ON public.regulatory_documents (category);
CREATE INDEX IF NOT EXISTS idx_reg_docs_authority  ON public.regulatory_documents (issuing_authority);
CREATE INDEX IF NOT EXISTS idx_reg_docs_effective  ON public.regulatory_documents (effective_date DESC);

-- tenders
CREATE INDEX IF NOT EXISTS idx_tenders_status      ON public.tenders (status);
CREATE INDEX IF NOT EXISTS idx_tenders_department  ON public.tenders (department);
CREATE INDEX IF NOT EXISTS idx_tenders_deadline    ON public.tenders (deadline);
CREATE INDEX IF NOT EXISTS idx_tenders_created_by  ON public.tenders (created_by);

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_tender_id ON public.contracts (tender_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status    ON public.contracts (status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date  ON public.contracts (end_date);

-- compliance_requirements
CREATE INDEX IF NOT EXISTS idx_creq_document_ref   ON public.compliance_requirements (document_ref);
CREATE INDEX IF NOT EXISTS idx_creq_category       ON public.compliance_requirements (category);

-- compliance_records
CREATE INDEX IF NOT EXISTS idx_crec_entity         ON public.compliance_records (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crec_requirement_id ON public.compliance_records (requirement_id);
CREATE INDEX IF NOT EXISTS idx_crec_status         ON public.compliance_records (status);
CREATE INDEX IF NOT EXISTS idx_crec_verified_by    ON public.compliance_records (verified_by);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_actor_id      ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity        ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at    ON public.audit_logs (created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_id       ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read       ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created_at    ON public.notifications (created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  ROW-LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 4.0  SECURITY-DEFINER helper  — has_role()
-- ---------------------------------------------------------------------------
-- Usage:  has_role(auth.uid(), 'admin')
-- Returns true when the given user_id has the specified role in user_roles.
-- SECURITY DEFINER means the function runs with the privileges of the DB
-- owner (bypassing RLS) for the user_roles lookup only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.user_roles
    WHERE  user_id = _user_id
      AND  role    = _role
  );
$$;

COMMENT ON FUNCTION public.has_role(UUID, app_role) IS
  'Returns true when _user_id has _role in public.user_roles. SECURITY DEFINER bypasses RLS for the lookup.';


-- ---------------------------------------------------------------------------
-- 4.1  user_roles policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_roles: authenticated users can read" ON public.user_roles;
CREATE POLICY "user_roles: authenticated users can read"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_roles: admins can insert" ON public.user_roles;
CREATE POLICY "user_roles: admins can insert"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles: admins can update" ON public.user_roles;
CREATE POLICY "user_roles: admins can update"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "user_roles: admins can delete" ON public.user_roles;
CREATE POLICY "user_roles: admins can delete"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 4.2  regulatory_documents policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "reg_docs: all authenticated can read" ON public.regulatory_documents;
CREATE POLICY "reg_docs: all authenticated can read"
  ON public.regulatory_documents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "reg_docs: admins can insert" ON public.regulatory_documents;
CREATE POLICY "reg_docs: admins can insert"
  ON public.regulatory_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "reg_docs: admins can update" ON public.regulatory_documents;
CREATE POLICY "reg_docs: admins can update"
  ON public.regulatory_documents FOR UPDATE
  TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "reg_docs: admins can delete" ON public.regulatory_documents;
CREATE POLICY "reg_docs: admins can delete"
  ON public.regulatory_documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 4.3  tenders policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenders: all authenticated can read" ON public.tenders;
CREATE POLICY "tenders: all authenticated can read"
  ON public.tenders FOR SELECT
  TO authenticated
  USING (true);

-- Officers (and admins) may create tenders
DROP POLICY IF EXISTS "tenders: officers and admins can insert" ON public.tenders;
CREATE POLICY "tenders: officers and admins can insert"
  ON public.tenders FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Officers may update their own tenders; admins may update any
DROP POLICY IF EXISTS "tenders: owners and admins can update" ON public.tenders;
CREATE POLICY "tenders: owners and admins can update"
  ON public.tenders FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "tenders: admins can delete" ON public.tenders;
CREATE POLICY "tenders: admins can delete"
  ON public.tenders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 4.4  contracts policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "contracts: all authenticated can read" ON public.contracts;
CREATE POLICY "contracts: all authenticated can read"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "contracts: officers and admins can insert" ON public.contracts;
CREATE POLICY "contracts: officers and admins can insert"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "contracts: officers and admins can update" ON public.contracts;
CREATE POLICY "contracts: officers and admins can update"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "contracts: admins can delete" ON public.contracts;
CREATE POLICY "contracts: admins can delete"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 4.5  compliance_requirements policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "creqs: all authenticated can read" ON public.compliance_requirements;
CREATE POLICY "creqs: all authenticated can read"
  ON public.compliance_requirements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "creqs: admins can insert" ON public.compliance_requirements;
CREATE POLICY "creqs: admins can insert"
  ON public.compliance_requirements FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creqs: admins can update" ON public.compliance_requirements;
CREATE POLICY "creqs: admins can update"
  ON public.compliance_requirements FOR UPDATE
  TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "creqs: admins can delete" ON public.compliance_requirements;
CREATE POLICY "creqs: admins can delete"
  ON public.compliance_requirements FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 4.6  compliance_records policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "crecs: all authenticated can read" ON public.compliance_records;
CREATE POLICY "crecs: all authenticated can read"
  ON public.compliance_records FOR SELECT
  TO authenticated
  USING (true);

-- Officers and admins may insert compliance records; auditors are read-only
DROP POLICY IF EXISTS "crecs: officers and admins can insert" ON public.compliance_records;
CREATE POLICY "crecs: officers and admins can insert"
  ON public.compliance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Officers may update records for their assigned entities (application-level
-- ownership check is recommended for finer-grained control)
DROP POLICY IF EXISTS "crecs: officers and admins can update" ON public.compliance_records;
CREATE POLICY "crecs: officers and admins can update"
  ON public.compliance_records FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'officer')
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "crecs: admins can delete" ON public.compliance_records;
CREATE POLICY "crecs: admins can delete"
  ON public.compliance_records FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 4.7  audit_logs policies
--      Immutable: INSERT only. NO UPDATE / DELETE policies for anyone.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs: all authenticated can read" ON public.audit_logs;
CREATE POLICY "audit_logs: all authenticated can read"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can write audit events (typically called via
-- a SECURITY DEFINER edge function / trigger in production). Remove this
-- policy and replace with a dedicated service-role insert if stricter
-- enforcement is required.
DROP POLICY IF EXISTS "audit_logs: authenticated can insert" ON public.audit_logs;
CREATE POLICY "audit_logs: authenticated can insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- *** No UPDATE policy  →  UPDATE is denied for all roles ***
-- *** No DELETE policy  →  DELETE is denied for all roles ***


-- ---------------------------------------------------------------------------
-- 4.8  notifications policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifs: users see their own" ON public.notifications;
CREATE POLICY "notifs: users see their own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifs: admins can insert" ON public.notifications;
CREATE POLICY "notifs: admins can insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users may update (mark as read) their own notifications only
DROP POLICY IF EXISTS "notifs: users can update own" ON public.notifications;
CREATE POLICY "notifs: users can update own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifs: users and admins can delete" ON public.notifications;
CREATE POLICY "notifs: users and admins can delete"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.  SEED DATA
--
-- UUIDs are generated by gen_random_uuid() at INSERT time.
-- Cross-table references are resolved via sub-SELECTs on business keys
-- (ref_number / tender_id / contract_ref) — no hard-coded UUIDs needed.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.1  regulatory_documents  (17 rows)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.regulatory_documents
  (ref_number, title, category, issuing_authority, effective_date, summary)
VALUES
(
  'DOC-001',
  'General Procurement Guidelines (Demo)',
  'Procurement',
  'Ministry of Finance',
  '2026-02-01',
  'Consolidated demo guideline describing the end-to-end procurement process: requirement planning, estimate approval, bid publication periods, bid opening, evaluation committees and award records. Applicable to all procurements above the prescribed demo threshold value.'
),
(
  'DOC-002',
  'Procurement Integrity Guidelines (Demo)',
  'Vigilance',
  'Central Vigilance Commission',
  '2026-02-05',
  'Demo integrity guideline covering conflict-of-interest declarations, integrity undertakings in bid documents, complaint handling and retention of procurement records for audit. Applicable to all tenders and contracts irrespective of value.'
),
(
  'DOC-003',
  'Contract Management Manual (Demo)',
  'Contract',
  'Government of India',
  '2025-08-01',
  'Demo manual for contract administration: milestone definition, performance security, variation orders, payment certification, renewal planning and contract closure records. Applicable to all contracts executed after the effective date.'
),
(
  'DOC-004',
  'Procurement Circular on Bid Validity (Demo)',
  'Procurement',
  'Ministry of Power',
  '2026-03-18',
  'Demo circular standardising bid validity periods and the procedure for seeking validity extension with recorded justification. Applicable to tenders published by power distribution formations.'
),
(
  'DOC-005',
  'Public Procurement Policy for Local Suppliers (Demo)',
  'Procurement',
  'Ministry of Finance',
  '2025-05-01',
  'Demo policy describing preference categories for local suppliers, the self-certification format and verification of claims during evaluation. Applicable to goods and services tenders where local content claims are made.'
),
(
  'DOC-006',
  'Office Memorandum on Contract Renewal Timelines (Demo)',
  'Contract',
  'Government of India',
  '2026-06-02',
  'Demo memorandum requiring renewal proposals to be initiated a defined number of days before contract expiry, with performance review on record. Applicable to service contracts eligible for renewal.'
),
(
  'DOC-007',
  'E-Procurement Portal Operating Regulation (Demo)',
  'Procurement',
  'Government of India',
  '2026-03-01',
  'Demo regulation on electronic publication of tenders, digital signing of bid documents, electronic bid opening records and system audit logs. Applicable to all tenders processed through the electronic portal.'
),
(
  'DOC-008',
  'Quality Assurance and Inspection Manual (Demo)',
  'Quality',
  'Ministry of Power',
  '2025-10-27',
  'Demo manual describing inspection stages, sampling plans, third-party inspection reports and rejection handling for supplied materials. Applicable to supply contracts for equipment and materials.'
),
(
  'DOC-009',
  'Vigilance Circular on Complaint Handling (Demo)',
  'Vigilance',
  'Central Vigilance Commission',
  '2025-12-16',
  'Demo circular on registering procurement-related complaints, timelines for preliminary examination and reporting of disposal. Applicable to all procurement formations.'
),
(
  'DOC-010',
  'Records Retention and Retrieval Policy (Demo)',
  'Records',
  'Government of India',
  '2026-02-03',
  'Demo policy on classification, retention period, indexing and retrieval of procurement records so that records remain authentic and traceable. Applicable to all procurement and contract records.'
),
(
  'DOC-011',
  'Financial Powers and Sanction Regulation (Demo)',
  'Finance',
  'Ministry of Finance',
  '2024-07-01',
  'Demo regulation listing delegated financial powers for administrative approval, expenditure sanction and variation approval limits. Applicable to all expenditure proposals.'
),
(
  'DOC-012',
  'Safety Compliance Guideline for Works Contracts (Demo)',
  'Safety',
  'Other Authorities',
  '2025-08-08',
  'Demo guideline on site safety plans, safety officer deployment and monthly safety reporting for works contracts. Applicable to civil and electrical works contracts.'
),
(
  'DOC-013',
  'Office Memorandum on Bid Security Declarations (Demo)',
  'Finance',
  'Ministry of Finance',
  '2026-04-21',
  'Demo memorandum permitting bid security declarations in place of monetary bid security for specified categories, with the declaration format annexed. Applicable to tenders in specified categories.'
),
(
  'DOC-014',
  'Vendor Performance Evaluation Guideline (Demo)',
  'Contract',
  'Government of India',
  '2026-05-11',
  'Demo guideline with a scoring framework for vendor performance covering timeliness, quality, documentation and responsiveness. Applicable to contracts exceeding six months in duration.'
),
(
  'DOC-015',
  'Procurement Planning Circular (Demo)',
  'Procurement',
  'Ministry of Finance',
  '2026-07-07',
  'Demo circular requiring an annual procurement plan with indicative timelines, consolidated demand and quarterly review of plan adherence. Applicable to all departments preparing annual procurement plans.'
),
(
  'DOC-016',
  'Legacy Procurement Guidelines (Demo, Superseded)',
  'Procurement',
  'Ministry of Finance',
  '2022-09-19',
  'Earlier demo guideline retained for historical reference. Superseded by DOC-001 version 2.0; retained so that older tender files remain traceable. Applicable to tenders published before 01 Feb 2026 only.'
),
(
  'DOC-017',
  'Archived Stores Handling Manual (Demo, Archived)',
  'Records',
  'Other Authorities',
  '2021-03-05',
  'Archived demo manual on stores receipt, inspection registers and issue notes. Kept for record traceability only. Not applicable to current procurements.'
)
ON CONFLICT (ref_number) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.2  tenders  (8 rows)
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: created_by is NULL for seed data (no real auth.users exist yet).
-- Re-run an UPDATE after user provisioning in production.
INSERT INTO public.tenders
  (tender_id, title, category, procurement_method, estimated_value, currency, status, department, deadline)
VALUES
(
  'TDR-2026-014',
  'IT Infrastructure Procurement',
  'Goods',
  'Open Tender (Goods)',
  25000000.00, 'INR', 'Under Review', 'Information Technology',
  '2026-10-02 23:59:59+05:30'
),
(
  'TDR-2026-016',
  'Distribution Transformer Supply',
  'Goods',
  'Open Tender (Goods)',
  41500000.00, 'INR', 'Published', 'Power Distribution',
  '2026-10-10 23:59:59+05:30'
),
(
  'TDR-2026-015',
  'Hospital Consumables Annual Rate Contract',
  'Services',
  'Rate Contract',
  8600000.00, 'INR', 'Evaluation', 'Health Services',
  '2026-09-26 23:59:59+05:30'
),
(
  'TDR-2026-012',
  'Substation Civil Works Package',
  'Works',
  'Open Tender (Works)',
  63200000.00, 'INR', 'Awarded', 'Civil Works',
  '2026-09-18 23:59:59+05:30'
),
(
  'TDR-2026-011',
  'Departmental Vehicle Hiring Services',
  'Services',
  'Limited Tender (Services)',
  4200000.00, 'INR', 'Closed', 'Stores & Purchase',
  '2026-08-28 23:59:59+05:30'
),
(
  'TDR-2026-010',
  'Office Building Electrical Renovation',
  'Works',
  'Open Tender (Works)',
  15800000.00, 'INR', 'Awarded', 'Civil Works',
  '2026-08-20 23:59:59+05:30'
),
(
  'TDR-2026-009',
  'Cyber Security Audit Services',
  'Services',
  'Quality & Cost Based Selection',
  6900000.00, 'INR', 'Under Review', 'Information Technology',
  '2026-10-08 23:59:59+05:30'
),
(
  'TDR-2026-018',
  'Solar Rooftop Installation (Draft)',
  'Works',
  'Open Tender (Works)',
  32000000.00, 'INR', 'Draft', 'Power Distribution',
  NULL
)
ON CONFLICT (tender_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.3  contracts  (8 rows)
-- ─────────────────────────────────────────────────────────────────────────────
-- tender_id resolved via sub-SELECT on business key
INSERT INTO public.contracts
  (contract_ref, tender_id, supplier_name, agreed_value, start_date, end_date, status)
VALUES
(
  'CON-2026-008',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  'ABC Technologies Pvt. Ltd. (Demo)',
  18000000.00, '2025-11-01', '2026-10-26', 'Expiring Soon'
),
(
  'CON-2026-011',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-016'),
  'Meridian Electricals (Demo)',
  39500000.00, '2026-03-15', '2027-03-14', 'Active'
),
(
  'CON-2026-005',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-015'),
  'Nivara Medical Supplies (Demo)',
  8200000.00, '2026-02-01', '2027-01-31', 'Active'
),
(
  'CON-2026-003',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-010'),
  'Sahyadri Constructions (Demo)',
  15200000.00, '2026-09-10', '2027-06-09', 'Active'
),
(
  'CON-2026-014',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-011'),
  'Trinetra Fleet Services (Demo)',
  4100000.00, '2026-10-01', '2027-09-30', 'Active'
),
(
  'CON-2026-019',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-009'),
  'Kavach Assurance LLP (Demo)',
  3400000.00, '2026-05-01', '2026-10-20', 'Expiring Soon'
),
(
  'CON-2025-019',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-011'),
  'Orion Systems (Demo)',
  7600000.00, '2025-06-01', '2026-05-31', 'Completed'
),
(
  'CON-2025-007',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-011'),
  'Vistaar Facility Services (Demo)',
  2900000.00, '2025-04-01', '2026-03-31', 'Terminated'
)
ON CONFLICT (contract_ref) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.4  compliance_requirements  (25 rows)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.compliance_requirements
  (title, document_ref, category, is_mandatory)
VALUES
('Publish tender notice for the minimum prescribed period',         'DOC-001', 'Procurement', true),
('Record the basis of estimated value in the tender file',          'DOC-001', 'Procurement', true),
('Constitute a documented evaluation committee',                    'DOC-001', 'Procurement', true),
('Include an integrity undertaking clause in the bid document',     'DOC-002', 'Vigilance',   true),
('Obtain conflict-of-interest declarations from committee members', 'DOC-002', 'Vigilance',   true),
('Maintain a retrievable record of complaints and their disposal',  'DOC-002', 'Vigilance',   true),
('Publish the tender on the electronic portal',                     'DOC-007', 'Procurement', true),
('Retain system-generated bid opening record',                      'DOC-007', 'Procurement', true),
('Preserve portal audit logs for the prescribed period',            'DOC-007', 'Records',     true),
('Index the tender file with a unique reference',                   'DOC-010', 'Records',     true),
('Link compliance evidence to the corresponding requirement',       'DOC-010', 'Records',     true),
('Obtain administrative approval from the competent authority',     'DOC-011', 'Finance',     true),
('Record expenditure sanction reference in the tender file',        'DOC-011', 'Finance',     true),
('Define measurable milestones in the contract schedule',           'DOC-003', 'Contract',    true),
('Obtain and track performance security validity',                  'DOC-003', 'Contract',    true),
('Record milestone verification before payment release',            'DOC-003', 'Contract',    true),
('State bid validity period explicitly in the notice',              'DOC-004', 'Procurement', true),
('Use the prescribed bid security declaration format',              'DOC-013', 'Finance',     true),
('Record stage-wise inspection reports',                            'DOC-008', 'Quality',     true),
('Obtain third-party inspection certificate where prescribed',      'DOC-008', 'Quality',     true),
('Initiate renewal proposal before the prescribed lead time',       'DOC-006', 'Contract',    true),
('Attach vendor performance review to the renewal note',            'DOC-006', 'Contract',    true),
('Record half-yearly vendor performance score',                     'DOC-014', 'Contract',    true),
('Obtain an approved site safety plan before work start',           'DOC-012', 'Safety',      true),
('Submit monthly safety compliance report',                         'DOC-012', 'Safety',      true)
ON CONFLICT (title, document_ref) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5.5  compliance_records  (23 rows)
--
-- Status mapping from demoData.ts:
--   "Compliant"           → 'compliant'
--   "Pending"             → 'pending'
--   "Partially Compliant" → 'under_review'   (closest DB enum value)
--   "Non-Compliant"       → 'non_compliant'
--   "Not Applicable"      → NO record inserted (absence signals N/A)
--
-- CR-015 (Obtain and track performance security validity) and
-- CR-016 (Record milestone verification before payment release)
-- were "Not Applicable" in demoData.ts — no records are created for them.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.compliance_records
  (entity_type, entity_id, requirement_id, status, justification, evidence_urls)

-- ── Tender: TDR-2026-014 ─────────────────────────────────────────────────────

SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Publish tender notice for the minimum prescribed period'
      AND document_ref = 'DOC-001'),
  'compliant', 'Notice published on the portal on 08 Sep 2026.', ARRAY['Evidence_CR-001.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Record the basis of estimated value in the tender file'
      AND document_ref = 'DOC-001'),
  'compliant', 'Estimate note approved by competent authority.', ARRAY['Evidence_CR-002.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Constitute a documented evaluation committee'
      AND document_ref = 'DOC-001'),
  'compliant', NULL, ARRAY['Evidence_CR-003.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Include an integrity undertaking clause in the bid document'
      AND document_ref = 'DOC-002'),
  'compliant', NULL, ARRAY['Evidence_CR-004.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Obtain conflict-of-interest declarations from committee members'
      AND document_ref = 'DOC-002'),
  'pending', 'Two declarations awaited from technical members.', '{}'

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Maintain a retrievable record of complaints and their disposal'
      AND document_ref = 'DOC-002'),
  'compliant', NULL, ARRAY['Evidence_CR-006.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Publish the tender on the electronic portal'
      AND document_ref = 'DOC-007'),
  'compliant', NULL, ARRAY['Evidence_CR-007.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Retain system-generated bid opening record'
      AND document_ref = 'DOC-007'),
  'compliant', NULL, ARRAY['Bid_Opening_Record.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Preserve portal audit logs for the prescribed period'
      AND document_ref = 'DOC-007'),
  'under_review', 'Logs available from Mar 2026 onward; earlier export in progress.', '{}'

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Index the tender file with a unique reference'
      AND document_ref = 'DOC-010'),
  'compliant', NULL, ARRAY['Evidence_CR-010.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Link compliance evidence to the corresponding requirement'
      AND document_ref = 'DOC-010'),
  'compliant', NULL, ARRAY['Evidence_CR-011.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Obtain administrative approval from the competent authority'
      AND document_ref = 'DOC-011'),
  'compliant', NULL, ARRAY['Evidence_CR-012.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Record expenditure sanction reference in the tender file'
      AND document_ref = 'DOC-011'),
  'pending', 'Sanction file under circulation.', '{}'

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-014'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Define measurable milestones in the contract schedule'
      AND document_ref = 'DOC-003'),
  'pending', 'Draft milestone schedule prepared, approval awaited.', '{}'

-- ── Tender: TDR-2026-016 ─────────────────────────────────────────────────────

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-016'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'State bid validity period explicitly in the notice'
      AND document_ref = 'DOC-004'),
  'compliant', NULL, ARRAY['Evidence_CR-017.pdf']

UNION ALL SELECT 'tender',
  (SELECT id FROM public.tenders WHERE tender_id = 'TDR-2026-016'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Use the prescribed bid security declaration format'
      AND document_ref = 'DOC-013'),
  'pending', NULL, '{}'

-- ── Contract: CON-2026-011 ───────────────────────────────────────────────────

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-011'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Record stage-wise inspection reports'
      AND document_ref = 'DOC-008'),
  'compliant', NULL, ARRAY['Lot1_Inspection_Report.pdf']

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-011'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Obtain third-party inspection certificate where prescribed'
      AND document_ref = 'DOC-008'),
  'under_review', 'Certificate received for lot 1; lot 2 pending.', '{}'

-- ── Contract: CON-2026-008 ───────────────────────────────────────────────────

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-008'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Initiate renewal proposal before the prescribed lead time'
      AND document_ref = 'DOC-006'),
  'pending', 'Renewal note to be initiated; contract expiry approaching.', '{}'

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-008'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Attach vendor performance review to the renewal note'
      AND document_ref = 'DOC-006'),
  'pending', NULL, '{}'

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-008'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Record half-yearly vendor performance score'
      AND document_ref = 'DOC-014'),
  'compliant', NULL, ARRAY['Vendor_Score_H1.pdf']

-- ── Contract: CON-2026-003 ───────────────────────────────────────────────────

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-003'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Obtain an approved site safety plan before work start'
      AND document_ref = 'DOC-012'),
  'compliant', NULL, ARRAY['Evidence_CR-024.pdf']

UNION ALL SELECT 'contract',
  (SELECT id FROM public.contracts WHERE contract_ref = 'CON-2026-003'),
  (SELECT id FROM public.compliance_requirements
    WHERE title = 'Submit monthly safety compliance report'
      AND document_ref = 'DOC-012'),
  'non_compliant', 'No safety report submitted for September 2026.', '{}';


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- =============================================================================
-- ProcureComply — Compliance Evidence Storage Bucket
-- Migration: 20261023000000_storage_compliance_evidence.sql
--
-- Creates a secure Supabase Storage bucket named "compliance-evidence" with
-- Row-Level Security policies for file access.
--
-- Rules:
--   • Authenticated users may read (download / view) any file.
--   • Only users with 'admin' or 'officer' role may upload / update / delete.
--   • Max file size: 10 MB (enforced at application layer).
--   • Allowed MIME types: application/pdf, image/png, image/jpeg
--     (enforced at application layer — Supabase Storage does not natively
--      enforce MIME in policies, so the upload API validates before calling
--      storage).
-- =============================================================================

-- 1. Create the bucket (public = false ⇒ requires signed URLs / auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-evidence',
  'compliance-evidence',
  false,
  10485760, -- 10 MB in bytes
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;


-- 2. RLS policies on storage.objects for this bucket

-- 2.1  SELECT — any authenticated user can download / view
CREATE POLICY "compliance_evidence_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'compliance-evidence');

-- 2.2  INSERT — only admin or officer may upload
CREATE POLICY "compliance_evidence_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-evidence'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'officer')
    )
  );

-- 2.3  UPDATE — only admin or officer may overwrite
CREATE POLICY "compliance_evidence_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'compliance-evidence'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'officer')
    )
  );

-- 2.4  DELETE — only admin or officer may remove
CREATE POLICY "compliance_evidence_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'compliance-evidence'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'officer')
    )
  );


-- 3. Add evidence_urls column to compliance_records if it doesn't exist
--    (Stores an array of storage paths for attached evidence files)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'compliance_records'
      AND column_name  = 'evidence_urls'
  ) THEN
    ALTER TABLE public.compliance_records
      ADD COLUMN evidence_urls TEXT[] DEFAULT '{}';
  END IF;
END;
$$;

COMMENT ON COLUMN public.compliance_records.evidence_urls
  IS 'Array of storage paths (bucket-relative) for attached evidence files.';

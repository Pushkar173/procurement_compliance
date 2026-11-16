/**
 * Evidence file storage API — upload, list, delete and get signed URLs for
 * compliance evidence files stored in Supabase Storage.
 *
 * Bucket: compliance-evidence
 * Max file size: 10 MB
 * Allowed types: PDF, PNG, JPEG
 */

import { supabase } from "../supabase";

const BUCKET = "compliance-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export interface EvidenceFile {
  name: string;
  path: string; // bucket-relative storage path
  size: number;
  type: string;
  url: string; // signed download URL
  uploadedAt: string;
}

/**
 * Validate a file before uploading.
 * Returns an error message or null if valid.
 */
export function validateEvidenceFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds the 10 MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `File type "${file.type}" is not allowed. Only PDF, PNG and JPEG files are accepted.`;
  }
  return null;
}

/**
 * Upload an evidence file to the compliance-evidence bucket.
 *
 * @param complianceRecordId - The compliance record this evidence belongs to
 * @param file - The file to upload
 * @returns The EvidenceFile metadata including a signed URL
 */
export async function uploadEvidenceFile(
  complianceRecordId: string,
  file: File,
): Promise<EvidenceFile> {
  const validationError = validateEvidenceFile(file);
  if (validationError) throw new Error(validationError);

  // Build a unique path: <complianceRecordId>/<timestamp>_<filename>
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${complianceRecordId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (uploadError) throw uploadError;

  // Get a signed URL valid for 1 hour
  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (urlError) throw urlError;

  return {
    name: file.name,
    path: storagePath,
    size: file.size,
    type: file.type,
    url: urlData.signedUrl,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * List all evidence files for a compliance record.
 */
export async function listEvidenceFiles(complianceRecordId: string): Promise<EvidenceFile[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(complianceRecordId, { sortBy: { column: "created_at", order: "desc" } });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Get signed URLs for all files
  const paths = data.map((f) => `${complianceRecordId}/${f.name}`);
  const { data: urlsData, error: urlsError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, 3600);

  if (urlsError) throw urlsError;

  return data.map((f, i) => ({
    name: f.name.replace(/^\d+_/, ""), // strip timestamp prefix
    path: `${complianceRecordId}/${f.name}`,
    size: f.metadata?.size ?? 0,
    type: f.metadata?.mimetype ?? "application/octet-stream",
    url: urlsData?.[i]?.signedUrl ?? "",
    uploadedAt: f.created_at ?? new Date().toISOString(),
  }));
}

/**
 * Get a fresh signed URL for a specific evidence file.
 */
export async function getEvidenceUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Remove an evidence file from storage.
 */
export async function deleteEvidenceFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

  if (error) throw error;
}

/**
 * Save evidence paths to the compliance_records table.
 */
export async function updateComplianceEvidenceUrls(
  complianceRecordId: string,
  evidenceUrls: string[],
): Promise<void> {
  const { error } = await supabase
    .from("compliance_records")
    .update({ evidence_urls: evidenceUrls })
    .eq("id", complianceRecordId);

  if (error) throw error;
}

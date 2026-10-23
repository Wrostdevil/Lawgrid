import { supabase } from '@/lib/supabase/client'
import type { Enums } from '@/types/supabase'

export async function uploadCaseDocument(
  citizenId: string,
  caseId: string,
  file: File,
  documentType: Enums<'document_type'>
) {
  // Upload to Supabase Storage
  const filePath = `${citizenId}/${caseId}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('case-documents')
    .upload(filePath, file)

  if (uploadError) return { data: null, error: uploadError }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('case-documents')
    .getPublicUrl(filePath)

  // Save record to DB
  const { data, error } = await supabase
    .from('case_documents')
    .insert({
      case_id: caseId,
      citizen_id: citizenId,
      document_type: documentType,
      file_name: file.name,
      file_url: publicUrl,
      file_size_kb: Math.round(file.size / 1024),
      mime_type: file.type,
      is_ai_generated: false
    })
    .select()
    .single()

  return { data, error }
}

export async function getCaseDocuments(caseId: string) {
  const { data, error } = await supabase
    .from('case_documents')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function deleteCaseDocument(documentId: string, fileUrl: string) {
  // Extract path from URL and delete from storage
  const path = fileUrl.split('/case-documents/')[1]
  if (path) {
    await supabase.storage.from('case-documents').remove([path])
  }

  const { error } = await supabase
    .from('case_documents')
    .delete()
    .eq('id', documentId)
  return { error }
}

export async function uploadLawyerPhoto(lawyerId: string, file: File) {
  const filePath = `${lawyerId}/${Date.now()}_${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('lawyer-photos')
    .upload(filePath, file, { upsert: true })

  if (uploadError) return { url: null, error: uploadError }

  const { data: { publicUrl } } = supabase.storage
    .from('lawyer-photos')
    .getPublicUrl(filePath)

  // Update lawyer profile with new photo URL
  await supabase
    .from('lawyer_profiles')
    .update({ profile_photo_url: publicUrl })
    .eq('id', lawyerId)

  return { url: publicUrl, error: null }
}

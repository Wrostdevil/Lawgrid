import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import EditLawyerProfileForm, { type LawyerProfileEditable } from './EditLawyerProfileForm'

export default async function LawyerProfileEditPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleData?.role && roleData.role !== 'lawyer' && roleData.role !== 'admin') {
    redirect('/citizen/home')
  }

  const { data: profile } = await supabase
    .from('lawyer_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const initialProfile: LawyerProfileEditable = {
    full_name: profile?.full_name ?? '',
    professional_title: profile?.professional_title ?? '',
    email: profile?.email ?? user.email ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
    practice_state: profile?.practice_state ?? '',
    practice_district: profile?.practice_district ?? '',
    bar_council_id: profile?.bar_council_id ?? '',
    enrollment_number: profile?.enrollment_number ?? '',
    state_bar_council: profile?.state_bar_council ?? '',
    enrollment_year: profile?.enrollment_year?.toString() ?? '',
    experience_years: profile?.experience_years?.toString() ?? '',
    fee_min: profile?.fee_min?.toString() ?? '',
    fee_max: profile?.fee_max?.toString() ?? '',
    response_time_hours: profile?.response_time_hours?.toString() ?? '',
    court_types: (profile?.court_types ?? []).join(', '),
    languages: (profile?.languages ?? []).join(', '),
    specialisations: profile?.specialisations ?? [],
    is_available: profile?.is_available ?? true,
  }

  return <EditLawyerProfileForm userId={user.id} initialProfile={initialProfile} />
}

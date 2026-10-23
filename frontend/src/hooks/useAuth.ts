'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  role: 'citizen' | 'lawyer' | 'admin' | null
  provider: 'google' | 'email' | 'phone' | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    provider: null,
    loading: true
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await getUserRole(session.user.id)
        const provider = getProvider(session)
        setState({ user: session.user, session, role, provider, loading: false })
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const role = await getUserRole(session.user.id)
          const provider = getProvider(session)
          setState({ user: session.user, session, role, provider, loading: false })
        } else {
          setState({ user: null, session: null, role: null, provider: null, loading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return state
}

async function getUserRole(userId: string) {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role ?? null
}

function getProvider(session: Session) {
  const provider = session.user?.app_metadata?.provider
  if (provider === 'google') return 'google'
  if (provider === 'phone') return 'phone'
  return 'email'
}

'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { Vendedor } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const supabase = createClient()

  const fetchVendedor = (userId: string) => {
    setProfileLoading(true)
    supabase
      .from('vendedores')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setVendedor(data)
        setProfileLoading(false)
      })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (session?.user) {
        fetchVendedor(session.user.id)
      } else {
        setProfileLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)

        if (!session?.user) {
          setVendedor(null)
          setProfileLoading(false)
          return
        }

        fetchVendedor(session.user.id)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isAdmin =
    vendedor?.perfil === 'admin' ||
    user?.user_metadata?.perfil === 'admin' ||
    user?.app_metadata?.perfil === 'admin'

  return {
    user,
    vendedor,
    perfil: vendedor?.perfil ?? (isAdmin ? 'admin' : null),
    isAdmin,
    loading,
    profileLoading,
    signOut,
  }
}

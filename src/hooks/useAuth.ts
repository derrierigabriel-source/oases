'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { Vendedor } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('vendedores')
          .select('*')
          .eq('id', user.id)
          .single()
        setVendedor(data)
      }

      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          const { data } = await supabase
            .from('vendedores')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setVendedor(data)
        } else {
          setVendedor(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    vendedor,
    perfil: vendedor?.perfil ?? null,
    loading,
    signOut,
  }
}

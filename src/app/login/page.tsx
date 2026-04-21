'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gem, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha email e senha')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos')
        } else {
          toast.error(error.message)
        }
        return
      }
      toast.success('Bem-vindo!')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 oases-pattern">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-gold/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-crimson/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-8 shadow-2xl shadow-black/60">

          {/* Ornamental top bar */}
          <div className="gold-divider mb-8" />

          {/* Logo */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
              <Gem size={28} className="text-brand-gold" />
            </div>
            <div className="text-center">
              <h1 className="font-display text-3xl font-semibold text-brand-gold tracking-widest">
                OASES
              </h1>
              <p className="text-xs text-brand-muted mt-1 tracking-widest uppercase">
                Gestão de Vendas
              </p>
            </div>
          </div>

          <div className="gold-divider mb-8" />

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Input
                label="Email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
              <Mail
                size={14}
                className="absolute right-3 top-[34px] text-brand-muted pointer-events-none"
              />
            </div>

            <div className="relative">
              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Lock
                size={14}
                className="absolute right-3 top-[34px] text-brand-muted pointer-events-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={loading}
            >
              Entrar
            </Button>
          </form>

          <div className="gold-divider mt-8" />

          <p className="text-xs text-brand-muted text-center mt-4 tracking-wide">
            Acesso restrito · Fale com o administrador
          </p>
        </div>
      </div>
    </div>
  )
}

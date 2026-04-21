'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, DollarSign, TrendingUp, CreditCard, ChevronRight, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase'
import { Venda } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import StatCard from '@/components/dashboard/StatCard'
import Badge from '@/components/ui/Badge'

interface DashboardData {
  totalEstoque: number
  valorEmEstoque: number
  vendasSemana: number
  totalReceber: number
  ultimasVendas: Venda[]
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DashboardPage() {
  const supabase = createClient()
  const { user, isAdmin } = useAuth()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Perfumes — visíveis para todos
        const { data: perfumesRaw } = await supabase
          .from('perfumes')
          .select('preco_base, quantidade_estoque')
          .eq('ativo', true)

        const perfumes = (perfumesRaw ?? []) as { preco_base: number; quantidade_estoque: number }[]

        const totalEstoque = perfumes.reduce(
          (acc, p) => acc + p.quantidade_estoque, 0
        )
        const valorEmEstoque = perfumes.reduce(
          (acc, p) => acc + p.preco_base * p.quantidade_estoque, 0
        )

        // Vendas na semana — RLS filtra automaticamente por perfil
        const umaSemanaAtras = new Date()
        umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7)
        umaSemanaAtras.setHours(0, 0, 0, 0)

        const { data: vendasSemanaRaw } = await supabase
          .from('vendas')
          .select('preco_praticado, quantidade')
          .gte('data_venda', umaSemanaAtras.toISOString())

        const vendasSemana = ((vendasSemanaRaw ?? []) as { preco_praticado: number; quantidade: number }[]).reduce(
          (acc, v) => acc + v.preco_praticado * v.quantidade, 0
        )

        // Parcelas a receber — RLS filtra automaticamente por perfil
        const { data: parcelasPendentes } = await supabase
          .from('parcelas')
          .select('valor')
          .in('status', ['pendente', 'atrasado'])

        const totalReceber = ((parcelasPendentes ?? []) as { valor: number }[]).reduce(
          (acc, p) => acc + p.valor, 0
        )

        // Últimas vendas — RLS filtra automaticamente por perfil
        const { data: ultimasVendasRaw } = await supabase
          .from('vendas')
          .select(`
            *,
            cliente:clientes(nome),
            perfume:perfumes(nome, marca),
            vendedor:vendedores(nome)
          `)
          .order('criado_em', { ascending: false })
          .limit(5)

        const ultimasVendas = (ultimasVendasRaw ?? []) as Venda[]

        setData({
          totalEstoque,
          valorEmEstoque,
          vendasSemana,
          totalReceber,
          ultimasVendas,
        })
      } catch {
        // erro de rede
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user?.id])

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-5 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-text">Dashboard</h1>
          <p className="text-brand-muted text-sm mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: admin vê valor em R$; vendedor vê contagem */}
          {isAdmin ? (
            <StatCard
              title="Valor em estoque"
              value={formatCurrency(data?.valorEmEstoque ?? 0)}
              icon={DollarSign}
              variant="gold"
              subtitle="total em produtos"
            />
          ) : (
            <StatCard
              title="Total em estoque"
              value={data?.totalEstoque ?? 0}
              icon={Package}
              subtitle="unidades"
            />
          )}

          {/* Card 2: admin vê contagem; vendedor vê unidades disponíveis */}
          <StatCard
            title="Itens em estoque"
            value={data?.totalEstoque ?? 0}
            icon={Package}
            subtitle="unidades disponíveis"
          />

          <StatCard
            title="Vendido na semana"
            value={formatCurrency(data?.vendasSemana ?? 0)}
            icon={TrendingUp}
            variant="gold"
          />
          <StatCard
            title="A receber"
            value={formatCurrency(data?.totalReceber ?? 0)}
            icon={CreditCard}
            variant={data && data.totalReceber > 0 ? 'success' : 'default'}
            subtitle="parcelas pendentes"
          />
        </div>

        {/* Últimas Vendas */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-brand-gold" />
                <h2 className="font-medium text-brand-text text-sm">
                  Últimas Vendas
                </h2>
              </div>
              <Link
                href="/vendas"
                className="text-xs text-brand-gold hover:text-brand-gold-dark flex items-center gap-1"
              >
                Ver tudo <ChevronRight size={14} />
              </Link>
            </div>

            {data && data.ultimasVendas.length === 0 ? (
              <div className="px-5 py-8 text-center text-brand-muted text-sm">
                Nenhuma venda registrada ainda.
                <br />
                <Link
                  href="/vendas/nova"
                  className="text-brand-gold hover:text-brand-gold-dark mt-2 inline-block"
                >
                  Registrar venda →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {data?.ultimasVendas.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {(v.perfume as any)?.nome}
                      </p>
                      <p className="text-xs text-brand-muted truncate">
                        {(v.cliente as any)?.nome}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-brand-gold">
                        {formatCurrency(v.preco_praticado * v.quantidade)}
                      </p>
                      <Badge status={v.status_pagamento} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick action */}
        <Link
          href="/vendas/nova"
          className="block w-full bg-brand-gold hover:bg-brand-gold-dark text-black font-semibold rounded-xl py-4 text-center transition-all active:scale-[0.99]"
        >
          + Nova Venda
        </Link>
      </div>
    </AppLayout>
  )
}

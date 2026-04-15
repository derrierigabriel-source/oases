'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, AlertTriangle, TrendingUp, CreditCard, ChevronRight, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase'
import { Perfume, Venda } from '@/lib/types'
import AppLayout from '@/components/layout/AppLayout'
import StatCard from '@/components/dashboard/StatCard'
import Badge from '@/components/ui/Badge'

interface DashboardData {
  totalEstoque: number
  perfumesCriticos: Perfume[]
  vendasHoje: number
  totalReceber: number
  ultimasVendas: Venda[]
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DashboardPage() {
  const supabase = createClient()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Perfumes
      const { data: perfumes } = await supabase
        .from('perfumes')
        .select('*')
        .eq('ativo', true)

      const totalEstoque = (perfumes ?? []).reduce(
        (acc, p) => acc + p.quantidade_estoque,
        0
      )
      const perfumesCriticos = (perfumes ?? []).filter(
        (p) => p.quantidade_estoque <= p.quantidade_minima_alerta
      )

      // Vendas hoje
      const { data: vendasHojeRaw } = await supabase
        .from('vendas')
        .select('preco_praticado, quantidade')
        .gte('data_venda', today.toISOString())

      const vendasHoje = (vendasHojeRaw ?? []).reduce(
        (acc, v) => acc + v.preco_praticado * v.quantidade,
        0
      )

      // Total a receber (parcelas pendentes)
      const { data: parcelasPendentes } = await supabase
        .from('parcelas')
        .select('valor')
        .in('status', ['pendente', 'atrasado'])

      const totalReceber = (parcelasPendentes ?? []).reduce(
        (acc, p) => acc + p.valor,
        0
      )

      // Últimas 5 vendas do dia
      const { data: ultimasVendas } = await supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes(nome),
          perfume:perfumes(nome, marca),
          vendedor:vendedores(nome)
        `)
        .gte('data_venda', today.toISOString())
        .order('criado_em', { ascending: false })
        .limit(5)

      setData({
        totalEstoque,
        perfumesCriticos,
        vendasHoje,
        totalReceber,
        ultimasVendas: ultimasVendas ?? [],
      })
      setLoading(false)
    }

    load()
  }, [])

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
          <StatCard
            title="Total em estoque"
            value={data?.totalEstoque ?? 0}
            icon={Package}
            subtitle="unidades"
          />
          <StatCard
            title="Estoque crítico"
            value={data?.perfumesCriticos.length ?? 0}
            icon={AlertTriangle}
            variant={data && data.perfumesCriticos.length > 0 ? 'warning' : 'default'}
            subtitle="perfumes abaixo do mínimo"
          />
          <StatCard
            title="Vendido hoje"
            value={formatCurrency(data?.vendasHoje ?? 0)}
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Estoque crítico */}
          {data && data.perfumesCriticos.length > 0 && (
            <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <h2 className="font-medium text-brand-text text-sm">
                    Estoque crítico
                  </h2>
                </div>
                <Link
                  href="/estoque"
                  className="text-xs text-brand-gold hover:text-brand-gold-dark flex items-center gap-1"
                >
                  Ver tudo <ChevronRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-brand-border">
                {data.perfumesCriticos.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-brand-text">{p.nome}</p>
                      <p className="text-xs text-brand-muted">{p.marca} · {p.tamanho_ml}ml</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-red-400">
                        {p.quantidade_estoque} un
                      </span>
                      <p className="text-xs text-brand-muted">
                        mín: {p.quantidade_minima_alerta}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimas vendas */}
          <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-brand-gold" />
                <h2 className="font-medium text-brand-text text-sm">
                  Últimas vendas de hoje
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
                Nenhuma venda hoje ainda.
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

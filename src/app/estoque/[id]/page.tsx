'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Package, DollarSign, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase'
import { Perfume, Venda } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Badge from '@/components/ui/Badge'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface VendaDetalhe extends Venda {
  cliente: { nome: string } | null
  vendedor: { nome: string } | null
}

export default function PerfumeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin } = useAuth()
  const id = params.id as string

  const [perfume, setPerfume] = useState<Perfume | null>(null)
  const [vendas, setVendas] = useState<VendaDetalhe[]>([])
  const [loading, setLoading] = useState(true)
  const [ajuste, setAjuste] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: p }, { data: v }] = await Promise.all([
          supabase.from('perfumes').select('*').eq('id', id).single(),
          supabase
            .from('vendas')
            .select(`
              *,
              cliente:clientes(nome),
              vendedor:vendedores(nome)
            `)
            .eq('perfume_id', id)
            .order('data_venda', { ascending: false }),
        ])
        setPerfume(p)
        setVendas((v as VendaDetalhe[]) ?? [])
      } catch {
        // erro de rede
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const margem =
    perfume?.custo && perfume.custo > 0
      ? ((perfume.preco_base - perfume.custo) / perfume.custo) * 100
      : null

  const precoSimulado = perfume ? perfume.preco_base * (1 + ajuste / 100) : 0

  const margemSimulada =
    perfume?.custo && perfume.custo > 0
      ? ((precoSimulado - perfume.custo) / perfume.custo) * 100
      : null

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-brand-card rounded-lg animate-pulse" />
          <div className="h-40 bg-brand-card rounded-xl animate-pulse" />
          <div className="h-36 bg-brand-card rounded-xl animate-pulse" />
          <div className="h-48 bg-brand-card rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    )
  }

  if (!perfume) {
    return (
      <AppLayout>
        <div className="text-center py-16 text-brand-muted">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Perfume não encontrado.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-brand-gold hover:text-brand-gold-dark text-sm"
          >
            ← Voltar ao estoque
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text">{perfume.nome}</h1>
            <p className="text-brand-muted text-sm">
              {perfume.marca} · {perfume.tamanho_ml}ml
            </p>
          </div>
        </div>

        {/* Informações do Produto */}
        <section className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-brand-muted">
            <Package size={14} />
            <h2 className="text-xs font-semibold uppercase tracking-wider">
              Informações do Produto
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-brand-muted mb-1">Em estoque</p>
              <p className="text-2xl font-bold text-brand-text">
                {perfume.quantidade_estoque}
                <span className="text-sm font-normal text-brand-muted ml-1">un</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-muted mb-1">Valor de venda</p>
              <p className="text-lg font-bold text-brand-gold">
                {formatCurrency(perfume.preco_base)}
              </p>
            </div>
            {isAdmin && perfume.custo != null && (
              <div>
                <p className="text-xs text-brand-muted mb-1">Custo</p>
                <p className="text-lg font-semibold text-brand-text">
                  {formatCurrency(perfume.custo)}
                </p>
              </div>
            )}
            {isAdmin && margem !== null && (
              <div>
                <p className="text-xs text-brand-muted mb-1">Margem de lucro</p>
                <p className={`text-lg font-bold ${margem >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {margem.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Simulador de Preço — só para admin e se tiver custo cadastrado */}
        {isAdmin && perfume.custo != null && (
          <section className="bg-brand-card border border-brand-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-brand-muted">
              <TrendingUp size={14} />
              <h2 className="text-xs font-semibold uppercase tracking-wider">
                Simulador de Preço
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-muted">Ajuste de preço</span>
                <span
                  className={`font-semibold tabular-nums ${
                    ajuste > 0
                      ? 'text-emerald-400'
                      : ajuste < 0
                      ? 'text-red-400'
                      : 'text-brand-text'
                  }`}
                >
                  {ajuste > 0 ? '+' : ''}{ajuste}%
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={ajuste}
                onChange={(e) => setAjuste(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-brand-gold bg-brand-surface"
              />
              <div className="flex justify-between text-xs text-brand-muted select-none">
                <span>-50%</span>
                <span>0%</span>
                <span>+100%</span>
              </div>
            </div>

            <div className="bg-brand-surface rounded-xl px-4 py-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-brand-muted">
                  {ajuste === 0 ? 'Valor atual' : `Valor com ${ajuste > 0 ? '+' : ''}${ajuste}% de ajuste`}
                </span>
                <span className="font-bold text-brand-gold text-lg">
                  {formatCurrency(precoSimulado)}
                </span>
              </div>
              {margemSimulada !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-muted">Margem resultante</span>
                  <span
                    className={`font-semibold ${
                      margemSimulada >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {margemSimulada.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Histórico de Vendas */}
        <section className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-border">
            <DollarSign size={14} className="text-brand-muted" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Histórico de Vendas
            </h2>
            <span className="ml-auto text-xs text-brand-muted">{vendas.length} venda{vendas.length !== 1 ? 's' : ''}</span>
          </div>

          {vendas.length === 0 ? (
            <div className="text-center py-12 text-brand-muted">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma venda registrada ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-surface/50">
                    <th className="text-left text-xs font-medium text-brand-muted px-5 py-3 whitespace-nowrap">Data</th>
                    <th className="text-left text-xs font-medium text-brand-muted px-3 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-brand-muted px-3 py-3 hidden sm:table-cell">Vendedor</th>
                    <th className="text-right text-xs font-medium text-brand-muted px-3 py-3">Qtd</th>
                    <th className="text-right text-xs font-medium text-brand-muted px-3 py-3 whitespace-nowrap">Valor</th>
                    <th className="text-right text-xs font-medium text-brand-muted px-3 py-3 hidden md:table-cell whitespace-nowrap">Desconto</th>
                    <th className="text-right text-xs font-medium text-brand-muted px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {vendas.map((v) => (
                    <tr key={v.id} className="hover:bg-brand-surface/40 transition-colors">
                      <td className="px-5 py-3 text-brand-text whitespace-nowrap">
                        {format(new Date(v.data_venda), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="px-3 py-3 text-brand-text max-w-[120px] truncate">
                        {(v.cliente as any)?.nome ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-brand-muted hidden sm:table-cell">
                        {(v.vendedor as any)?.nome ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-brand-text text-right">
                        {v.quantidade}
                      </td>
                      <td className="px-3 py-3 text-brand-gold font-semibold text-right whitespace-nowrap">
                        {formatCurrency(v.preco_praticado * v.quantidade)}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap hidden md:table-cell">
                        {v.desconto_aplicado > 0 ? (
                          <span className="text-amber-400">
                            -{formatCurrency(v.desconto_aplicado)}
                          </span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge status={v.status_pagamento} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  )
}

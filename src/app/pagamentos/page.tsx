'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { CreditCard, Check } from 'lucide-react'
import { format, isPast, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { Parcela } from '@/lib/types'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Tab = 'pendentes' | 'atrasadas' | 'pagas'

interface ParcelaEnriquecida extends Omit<Parcela, 'venda'> {
  venda: {
    cliente: { nome: string; telefone_whatsapp: string | null }
    perfume: { nome: string; marca: string }
  }
}

export default function PagamentosPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('pendentes')
  const [parcelas, setParcelas] = useState<ParcelaEnriquecida[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)

    // Atualizar status de atrasadas automaticamente
    const hoje = new Date().toISOString().split('T')[0]
    await supabase
      .from('parcelas')
      .update({ status: 'atrasado' })
      .eq('status', 'pendente')
      .lt('data_vencimento', hoje)
      .not('data_vencimento', 'is', null)

    let statusFilter: string[]
    if (tab === 'pendentes') statusFilter = ['pendente']
    else if (tab === 'atrasadas') statusFilter = ['atrasado']
    else statusFilter = ['pago']

    const { data } = await supabase
      .from('parcelas')
      .select(`
        *,
        venda:vendas(
          cliente:clientes(nome, telefone_whatsapp),
          perfume:perfumes(nome, marca)
        )
      `)
      .in('status', statusFilter)
      .order('data_vencimento', { ascending: tab !== 'pagas' })
      .limit(100)

    setParcelas((data as ParcelaEnriquecida[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const marcarPago = async (id: string) => {
    setMarking(id)
    try {
      const { error } = await supabase
        .from('parcelas')
        .update({
          status: 'pago',
          data_pagamento: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      toast.success('Parcela marcada como paga!')
      setParcelas((prev) => prev.filter((p) => p.id !== id))
    } catch {
      toast.error('Erro ao atualizar parcela')
    } finally {
      setMarking(null)
    }
  }

  const total = parcelas.reduce((acc, p) => acc + p.valor, 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pendentes', label: 'Pendentes' },
    { key: 'atrasadas', label: 'Atrasadas' },
    { key: 'pagas', label: 'Pagas' },
  ]

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-text">Pagamentos</h1>
          <p className="text-brand-muted text-sm mt-1">Gestão de cobranças e parcelas</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-brand-card border border-brand-border rounded-xl p-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`
                flex-1 py-2 text-sm font-medium rounded-lg transition-all
                ${tab === key
                  ? 'bg-brand-gold text-black'
                  : 'text-brand-muted hover:text-brand-text'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Total */}
        {!loading && parcelas.length > 0 && tab !== 'pagas' && (
          <div className="bg-brand-card border border-brand-border rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-brand-muted">
              {parcelas.length} {parcelas.length === 1 ? 'parcela' : 'parcelas'}
            </span>
            <span className="font-semibold text-brand-gold">{formatCurrency(total)}</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : parcelas.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {tab === 'pendentes' && 'Nenhuma parcela pendente.'}
              {tab === 'atrasadas' && 'Nenhuma parcela atrasada.'}
              {tab === 'pagas' && 'Nenhum pagamento registrado.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {parcelas.map((p) => {
              const atrasada = p.status === 'atrasado'
              const vencida = p.data_vencimento
                ? isPast(parseISO(p.data_vencimento))
                : false

              return (
                <div
                  key={p.id}
                  className={`
                    bg-brand-card border rounded-xl px-5 py-4 flex items-center gap-4 animate-fadeIn
                    ${atrasada ? 'border-red-800/40 bg-red-950/10' : 'border-brand-border'}
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-text text-sm truncate">
                          {p.venda?.cliente?.nome}
                        </p>
                        <p className="text-xs text-brand-muted mt-0.5">
                          {p.venda?.perfume?.nome} · {p.venda?.perfume?.marca}
                        </p>
                      </div>
                      <Badge status={p.status} />
                    </div>

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <p className="text-brand-gold font-semibold">{formatCurrency(p.valor)}</p>
                      {p.data_vencimento && (
                        <p className={`text-xs ${atrasada ? 'text-red-400' : 'text-brand-muted'}`}>
                          {atrasada ? '⚠ ' : ''}
                          Vence: {format(parseISO(p.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                      {!p.data_vencimento && (
                        <p className="text-xs text-amber-400">Sem data (fiado)</p>
                      )}
                      {p.data_pagamento && (
                        <p className="text-xs text-emerald-400">
                          Pago: {format(new Date(p.data_pagamento), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {tab !== 'pagas' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={marking === p.id}
                      onClick={() => marcarPago(p.id)}
                      className="shrink-0"
                    >
                      <Check size={14} />
                      Pago
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronDown, ChevronUp, Filter, ShoppingBag, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase'
import { Venda, Parcela, Perfume, Cliente, Vendedor } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formaLabel: Record<string, string> = {
  a_vista: 'À vista',
  parcelado: 'Parcelado',
  fiado: 'Fiado',
}

export default function VendasPage() {
  const supabase = createClient()
  const { isAdmin } = useAuth()

  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedParcelas, setExpandedParcelas] = useState<Parcela[]>([])

  // Listas para os selects de filtro
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])

  // Filtros
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterPerfume, setFilterPerfume] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [filterForma, setFilterForma] = useState('')

  const temFiltroAtivo = Boolean(
    filterStatus || filterDate || filterPerfume ||
    filterCliente || filterVendedor || filterForma
  )

  const limparFiltros = () => {
    setFilterStatus('')
    setFilterDate('')
    setFilterPerfume('')
    setFilterCliente('')
    setFilterVendedor('')
    setFilterForma('')
  }

  // Carrega listas de filtros uma vez
  useEffect(() => {
    supabase.from('perfumes').select('id, nome, marca').eq('ativo', true).order('nome').then(({ data }) => {
      setPerfumes((data as Perfume[]) ?? [])
    })
    supabase.from('clientes').select('id, nome').order('nome').then(({ data }) => {
      setClientes((data as Cliente[]) ?? [])
    })
    supabase.from('vendedores').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => {
      setVendedores((data as Vendedor[]) ?? [])
    })
  }, [])

  const load = async () => {
    try {
      let query = supabase
        .from('vendas')
        .select(`
          *,
          cliente:clientes(nome, telefone_whatsapp),
          perfume:perfumes(nome, marca, tamanho_ml),
          vendedor:vendedores(nome)
        `)
        .order('criado_em', { ascending: false })
        .limit(100)

      if (filterStatus) query = query.eq('status_pagamento', filterStatus)
      if (filterForma) query = query.eq('forma_pagamento', filterForma)
      if (filterPerfume) query = query.eq('perfume_id', filterPerfume)
      if (filterCliente) query = query.eq('cliente_id', filterCliente)
      if (filterVendedor) query = query.eq('vendedor_id', filterVendedor)
      if (filterDate) {
        const start = new Date(filterDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(filterDate)
        end.setHours(23, 59, 59, 999)
        query = query
          .gte('data_venda', start.toISOString())
          .lte('data_venda', end.toISOString())
      }

      const { data } = await query
      setVendas((data ?? []) as Venda[])
    } catch {
      // erro de rede
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [filterStatus, filterDate, filterPerfume, filterCliente, filterVendedor, filterForma])

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    const { data } = await supabase
      .from('parcelas')
      .select('*')
      .eq('venda_id', id)
      .order('numero_parcela')
    setExpandedParcelas((data ?? []) as Parcela[])
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text">Vendas</h1>
            <p className="text-brand-muted text-sm mt-1">Histórico completo</p>
          </div>
          <Link href="/vendas/nova">
            <Button>
              <Plus size={16} />
              Nova venda
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-muted text-sm">
              <Filter size={14} />
              <span className="font-medium">Filtros</span>
              {temFiltroAtivo && (
                <span className="bg-brand-gold text-black text-xs font-semibold rounded-full px-1.5 py-0.5">
                  {[filterStatus, filterDate, filterPerfume, filterCliente, filterVendedor, filterForma].filter(Boolean).length}
                </span>
              )}
            </div>
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-xs text-brand-gold hover:text-brand-gold-dark transition-colors"
              >
                <X size={12} />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Produto */}
            <select
              value={filterPerfume}
              onChange={(e) => setFilterPerfume(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40 col-span-1"
            >
              <option value="">Todos os produtos</option>
              {perfumes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>

            {/* Cliente */}
            <select
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>

            {/* Vendedor — apenas admin */}
            {isAdmin && (
              <select
                value={filterVendedor}
                onChange={(e) => setFilterVendedor(e.target.value)}
                className="px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
              >
                <option value="">Todos os vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            )}

            {/* Forma de pagamento */}
            <select
              value={filterForma}
              onChange={(e) => setFilterForma(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            >
              <option value="">Todas as formas</option>
              <option value="a_vista">À vista</option>
              <option value="parcelado">Parcelado</option>
              <option value="fiado">Fiado</option>
            </select>

            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            >
              <option value="">Todos os status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
            </select>

            {/* Data */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : vendas.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {temFiltroAtivo ? 'Nenhuma venda encontrada com os filtros aplicados.' : 'Nenhuma venda encontrada.'}
            </p>
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="mt-3 text-brand-gold hover:text-brand-gold-dark text-sm"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {vendas.map((v) => {
              const expanded = expandedId === v.id
              const total = v.preco_praticado * v.quantidade
              return (
                <div
                  key={v.id}
                  className="bg-brand-card border border-brand-border rounded-xl overflow-hidden animate-fadeIn"
                >
                  {/* Main row */}
                  <button
                    onClick={() => toggleExpand(v.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-brand-surface/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-text text-sm truncate">
                          {(v.perfume as any)?.nome}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {(v.perfume as any)?.marca} · {v.quantidade} un
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-brand-text truncate">
                          {(v.cliente as any)?.nome}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {formaLabel[v.forma_pagamento]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <p className="text-sm font-semibold text-brand-gold">
                          {formatCurrency(total)}
                        </p>
                        <Badge status={v.status_pagamento} />
                      </div>
                    </div>
                    <div className="text-brand-muted shrink-0">
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  {/* Expanded */}
                  {expanded && (
                    <div className="border-t border-brand-border px-5 py-4 space-y-4 animate-fadeIn">
                      {/* Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-brand-muted">Data</p>
                          <p className="text-brand-text">
                            {format(new Date(v.data_venda), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-muted">Vendedor</p>
                          <p className="text-brand-text">{(v.vendedor as any)?.nome}</p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-muted">Preço base</p>
                          <p className="text-brand-text">
                            {formatCurrency(v.preco_base_momento)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-brand-muted">Desconto</p>
                          <p className={v.desconto_aplicado > 0 ? 'text-amber-400' : 'text-brand-muted'}>
                            {v.desconto_aplicado > 0 ? formatCurrency(v.desconto_aplicado) : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Parcelas */}
                      {expandedParcelas.length > 0 && (
                        <div>
                          <p className="text-xs text-brand-muted font-medium mb-2">Parcelas</p>
                          <div className="space-y-2">
                            {expandedParcelas.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between bg-brand-surface rounded-lg px-4 py-2.5"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-brand-muted w-6">
                                    {p.numero_parcela}x
                                  </span>
                                  <div>
                                    <p className="text-sm text-brand-text">
                                      {formatCurrency(p.valor)}
                                    </p>
                                    {p.data_vencimento && (
                                      <p className="text-xs text-brand-muted">
                                        Vence: {format(new Date(p.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Badge status={p.status} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {v.observacoes && (
                        <div className="bg-brand-surface rounded-lg px-4 py-2.5">
                          <p className="text-xs text-brand-muted">Observações</p>
                          <p className="text-sm text-brand-text mt-0.5">{v.observacoes}</p>
                        </div>
                      )}
                    </div>
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

'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Search, Users, Phone, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { Cliente, Venda, Parcela } from '@/lib/types'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface ClienteComSaldo extends Cliente {
  saldo_pendente: number
  total_compras: number
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<ClienteComSaldo[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', telefone_whatsapp: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<{ vendas: Venda[]; parcelas: Parcela[] }>({ vendas: [], parcelas: [] })

  const load = async () => {
    try {
      const { data: clientesRawData } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')

      const clientesRaw = (clientesRawData ?? []) as Cliente[]

      // Buscar saldos
      const { data: parcelas } = await supabase
        .from('parcelas')
        .select('valor, status, venda:vendas(cliente_id)')
        .in('status', ['pendente', 'atrasado'])

      const saldoMap: Record<string, number> = {}
      ;(parcelas ?? []).forEach((p: any) => {
        const clienteId = p.venda?.cliente_id
        if (clienteId) {
          saldoMap[clienteId] = (saldoMap[clienteId] ?? 0) + p.valor
        }
      })

      // Buscar total de compras
      const { data: vendasTotal } = await supabase
        .from('vendas')
        .select('cliente_id, preco_praticado, quantidade')

      const totalMap: Record<string, number> = {}
      ;(vendasTotal ?? []).forEach((v: any) => {
        totalMap[v.cliente_id] = (totalMap[v.cliente_id] ?? 0) + v.preco_praticado * v.quantidade
      })

      setClientes(
        clientesRaw.map((c) => ({
          ...c,
          saldo_pendente: saldoMap[c.id] ?? 0,
          total_compras: totalMap[c.id] ?? 0,
        }))
      )
    } catch {
      // erro de rede (ex: Supabase pausado)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone_whatsapp ?? '').includes(search)
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Informe o nome'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('clientes').insert({
        nome: form.nome.trim(),
        telefone_whatsapp: form.telefone_whatsapp.trim() || null,
        observacoes: form.observacoes.trim() || null,
      } as any)
      if (error) throw error
      toast.success('Cliente cadastrado!')
      setModalOpen(false)
      setForm({ nome: '', telefone_whatsapp: '', observacoes: '' })
      load()
    } catch {
      toast.error('Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    const { data: vendas } = await supabase
      .from('vendas')
      .select('*, perfume:perfumes(nome, marca)')
      .eq('cliente_id', id)
      .order('data_venda', { ascending: false })
      .limit(10)

    const vendaIds = (vendas ?? []).map((v) => v.id)
    let parcelas: Parcela[] = []
    if (vendaIds.length > 0) {
      const { data } = await supabase
        .from('parcelas')
        .select('*')
        .in('venda_id', vendaIds)
        .in('status', ['pendente', 'atrasado'])
      parcelas = data ?? []
    }
    setExpandedData({ vendas: vendas ?? [], parcelas })
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text">Clientes</h1>
            <p className="text-brand-muted text-sm mt-1">
              {clientes.length} clientes cadastrados
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Novo cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-5 h-16 animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((c) => {
              const expanded = expandedId === c.id
              const temDivida = c.saldo_pendente > 0
              return (
                <div
                  key={c.id}
                  className="bg-brand-card border border-brand-border rounded-xl overflow-hidden animate-fadeIn"
                >
                  <button
                    onClick={() => toggleExpand(c.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-brand-surface/50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-surface flex items-center justify-center text-brand-text font-semibold shrink-0">
                      {c.nome.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brand-text truncate">{c.nome}</p>
                        <Badge status={temDivida ? 'pendente' : 'ok'} label={temDivida ? 'Devendo' : 'Em dia'} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {c.telefone_whatsapp && (
                          <span className="text-xs text-brand-muted flex items-center gap-1">
                            <Phone size={11} />
                            {c.telefone_whatsapp}
                          </span>
                        )}
                        <span className="text-xs text-brand-muted">
                          Total: {formatCurrency(c.total_compras)}
                        </span>
                        {temDivida && (
                          <span className="text-xs text-amber-400">
                            Deve: {formatCurrency(c.saldo_pendente)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.telefone_whatsapp && (
                        <a
                          href={`https://wa.me/55${c.telefone_whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                          title="WhatsApp"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <div className="text-brand-muted">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded */}
                  {expanded && (
                    <div className="border-t border-brand-border px-5 py-4 space-y-4 animate-fadeIn">
                      {expandedData.parcelas.length > 0 && (
                        <div>
                          <p className="text-xs text-brand-muted font-medium mb-2">Parcelas em aberto</p>
                          <div className="space-y-2">
                            {expandedData.parcelas.map((p) => (
                              <div key={p.id} className="flex items-center justify-between bg-amber-900/10 border border-amber-800/30 rounded-lg px-4 py-2.5">
                                <div>
                                  <p className="text-sm font-medium text-brand-text">
                                    {formatCurrency(p.valor)}
                                  </p>
                                  {p.data_vencimento && (
                                    <p className="text-xs text-brand-muted">
                                      Vence: {format(new Date(p.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy')}
                                    </p>
                                  )}
                                </div>
                                <Badge status={p.status} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {expandedData.vendas.length > 0 && (
                        <div>
                          <p className="text-xs text-brand-muted font-medium mb-2">Histórico de compras</p>
                          <div className="space-y-2">
                            {expandedData.vendas.slice(0, 5).map((v) => (
                              <div key={v.id} className="flex items-center justify-between bg-brand-surface rounded-lg px-4 py-2.5">
                                <div>
                                  <p className="text-sm text-brand-text">
                                    {(v.perfume as any)?.nome}
                                  </p>
                                  <p className="text-xs text-brand-muted">
                                    {format(new Date(v.data_venda), 'dd/MM/yyyy')} · {v.quantidade} un
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-brand-gold">
                                    {formatCurrency(v.preco_praticado * v.quantidade)}
                                  </p>
                                  <Badge status={v.status_pagamento} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {c.observacoes && (
                        <div className="bg-brand-surface rounded-lg px-4 py-2.5">
                          <p className="text-xs text-brand-muted">Observações</p>
                          <p className="text-sm text-brand-text mt-0.5">{c.observacoes}</p>
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

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Cliente">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Nome completo"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
            autoFocus
          />
          <Input
            label="WhatsApp"
            placeholder="(41) 99999-9999"
            value={form.telefone_whatsapp}
            onChange={(e) => setForm({ ...form, telefone_whatsapp: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brand-text-dim">Observações</label>
            <textarea
              placeholder="Preferências, histórico..."
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-brand-card border border-brand-border text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Cadastrar
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}

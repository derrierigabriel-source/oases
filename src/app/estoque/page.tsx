'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Minus, Package, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { Perfume, Lote } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const emptyForm = {
  nome: '',
  marca: '',
  tamanho_ml: '',
  quantidade_estoque: '',
  preco_base: '',
  custo: '',         // BRL — usado quando NÃO há lote selecionado
  custo_dolar: '',   // USD — usado quando há lote selecionado
  lote_id: '',
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcularCustoReal(custoDolar: number, lote: Lote): number {
  const base = custoDolar * lote.dolar
  if (lote.entrega && lote.taxa_entrega) {
    return base * (1 + lote.taxa_entrega / 100)
  }
  return base
}

export default function EstoquePage() {
  const supabase = createClient()
  const router = useRouter()
  const { isAdmin, profileLoading } = useAuth()
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [filtered, setFiltered] = useState<Perfume[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Perfume | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const loteAtual = lotes.find((l) => l.id === form.lote_id) ?? null

  const custoPreviewBRL =
    loteAtual && form.custo_dolar
      ? calcularCustoReal(parseFloat(form.custo_dolar), loteAtual)
      : null

  const load = async () => {
    try {
      const [{ data: perfumesData }, { data: lotesData }] = await Promise.all([
        supabase.from('perfumes').select('*').eq('ativo', true).order('nome'),
        (supabase as any).from('lotes').select('*').order('data_compra', { ascending: false }),
      ])
      setPerfumes((perfumesData ?? []) as Perfume[])
      setLotes((lotesData ?? []) as Lote[])
    } catch {
      // erro de rede
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(perfumes)
    } else {
      const q = search.toLowerCase()
      setFiltered(
        perfumes.filter(
          (p) =>
            p.nome.toLowerCase().includes(q) ||
            p.marca.toLowerCase().includes(q)
        )
      )
    }
  }, [search, perfumes])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (p: Perfume) => {
    setEditing(p)
    setForm({
      nome: p.nome,
      marca: p.marca,
      tamanho_ml: String(p.tamanho_ml),
      quantidade_estoque: String(p.quantidade_estoque),
      preco_base: String(p.preco_base),
      custo: p.lote_id ? '' : String(p.custo ?? ''),
      custo_dolar: p.custo_dolar != null ? String(p.custo_dolar) : '',
      lote_id: p.lote_id ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome || !form.marca || !form.tamanho_ml || !form.preco_base) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        marca: form.marca.trim(),
        tamanho_ml: parseInt(form.tamanho_ml),
        quantidade_estoque: parseInt(form.quantidade_estoque) || 0,
        preco_base: parseFloat(form.preco_base),
        lote_id: form.lote_id || null,
        custo_dolar: form.custo_dolar ? parseFloat(form.custo_dolar) : null,
      }

      // Calcula custo em BRL
      if (form.lote_id && form.custo_dolar && loteAtual) {
        payload.custo = calcularCustoReal(parseFloat(form.custo_dolar), loteAtual)
      } else if (!form.lote_id && form.custo !== '') {
        payload.custo = parseFloat(form.custo)
      }

      if (editing) {
        const { error } = await (supabase as any)
          .from('perfumes')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Perfume atualizado!')
      } else {
        const { error } = await (supabase as any).from('perfumes').insert(payload)
        if (error) throw error
        toast.success('Perfume adicionado!')
      }

      setModalOpen(false)
      load()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const ajustarEstoque = async (id: string, delta: number) => {
    const perfume = perfumes.find((p) => p.id === id)
    if (!perfume) return
    const nova = Math.max(0, perfume.quantidade_estoque + delta)
    const { error } = await (supabase as any)
      .from('perfumes')
      .update({ quantidade_estoque: nova })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar estoque')
      return
    }
    setPerfumes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantidade_estoque: nova } : p))
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text">Estoque</h1>
            <p className="text-brand-muted text-sm mt-1">
              {perfumes.length} {perfumes.length === 1 ? 'perfume' : 'perfumes'} cadastrados
            </p>
          </div>
          {(profileLoading || isAdmin) && (
            <Button onClick={openNew} disabled={profileLoading}>
              <Plus size={16} />
              Adicionar
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome ou marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold/50"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search ? 'Nenhum perfume encontrado.' : 'Nenhum perfume cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/estoque/${p.id}`)}
                className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col gap-3 animate-fadeIn cursor-pointer hover:border-brand-gold/40 transition-colors"
              >
                {/* Top */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-text truncate">{p.nome}</p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {p.marca} · {p.tamanho_ml}ml
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                      className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors shrink-0"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>

                {/* Price */}
                <p className="text-brand-gold font-semibold text-lg">
                  {formatCurrency(p.preco_base)}
                </p>

                {/* Stock */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-muted">
                    {p.quantidade_estoque} un em estoque
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); ajustarEstoque(p.id, -1) }}
                        disabled={p.quantidade_estoque === 0}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-muted disabled:opacity-30 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-lg font-bold w-8 text-center text-brand-text">
                        {p.quantidade_estoque}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); ajustarEstoque(p.id, 1) }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold/50 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Perfume' : 'Novo Perfume'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="ex: Sauvage"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <Input
            label="Marca *"
            placeholder="ex: Dior"
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tamanho (ml) *"
              type="number"
              placeholder="100"
              min="1"
              value={form.tamanho_ml}
              onChange={(e) => setForm({ ...form, tamanho_ml: e.target.value })}
              required
            />
            <Input
              label="Quantidade em estoque"
              type="number"
              placeholder="0"
              min="0"
              value={form.quantidade_estoque}
              onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })}
            />
          </div>

          <Input
            label="Valor de Venda (R$) *"
            type="number"
            placeholder="0,00"
            min="0"
            step="0.01"
            value={form.preco_base}
            onChange={(e) => setForm({ ...form, preco_base: e.target.value })}
            required
          />

          {/* Custo — só para admin */}
          {profileLoading && (
            <div className="space-y-3 pt-1 border-t border-brand-border animate-pulse">
              <div className="h-4 w-24 bg-brand-card rounded mt-1" />
              <div className="h-10 bg-brand-card rounded-lg" />
              <div className="h-10 bg-brand-card rounded-lg" />
            </div>
          )}
          {!profileLoading && isAdmin && (
            <div className="space-y-3 pt-1 border-t border-brand-border">
              <p className="text-xs font-medium text-brand-muted uppercase tracking-wider pt-1">
                Custo (admin)
              </p>

              {/* Seletor de Lote */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-brand-text-dim">Lote de compra</label>
                <select
                  value={form.lote_id}
                  onChange={(e) => setForm({ ...form, lote_id: e.target.value, custo_dolar: '', custo: '' })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-brand-card border border-brand-border text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold/50"
                >
                  <option value="">— Sem lote (custo manual em R$) —</option>
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {format(parseISO(l.data_compra), 'dd/MM/yyyy', { locale: ptBR })}
                      {' — '}
                      US$ 1 = R$ {Number(l.dolar).toFixed(2)}
                      {l.entrega ? ` + ${l.taxa_entrega}% entrega` : ' (pessoal)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custo em dólar — quando lote selecionado */}
              {form.lote_id ? (
                <div className="space-y-2">
                  <Input
                    label="Custo em dólar (US$)"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={form.custo_dolar}
                    onChange={(e) => setForm({ ...form, custo_dolar: e.target.value })}
                    hint={
                      loteAtual
                        ? loteAtual.entrega
                          ? `Câmbio R$ ${Number(loteAtual.dolar).toFixed(2)} + ${loteAtual.taxa_entrega}% taxa de entrega`
                          : `Câmbio R$ ${Number(loteAtual.dolar).toFixed(2)} · sem taxa de entrega`
                        : undefined
                    }
                  />
                  {custoPreviewBRL !== null && (
                    <div className="flex items-center justify-between bg-brand-surface rounded-lg px-3 py-2.5 border border-brand-border">
                      <div className="flex items-center gap-2 text-brand-muted text-sm">
                        <DollarSign size={13} />
                        Custo calculado em R$
                      </div>
                      <span className="font-semibold text-brand-gold text-sm">
                        {formatCurrency(custoPreviewBRL)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Custo manual em BRL — quando sem lote */
                <Input
                  label="Custo (R$)"
                  type="number"
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                  value={form.custo}
                  onChange={(e) => setForm({ ...form, custo: e.target.value })}
                />
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {editing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}

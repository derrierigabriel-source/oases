'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Search, Pencil, Minus, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { Perfume } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

const emptyForm = {
  nome: '',
  marca: '',
  tamanho_ml: '',
  quantidade_estoque: '',
  preco_base: '',
  custo: '',
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function EstoquePage() {
  const supabase = createClient()
  const router = useRouter()
  const { isAdmin, profileLoading } = useAuth()
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [filtered, setFiltered] = useState<Perfume[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Perfume | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const { data } = await supabase
        .from('perfumes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      setPerfumes((data ?? []) as Perfume[])
    } catch {
      // erro de rede (ex: Supabase pausado)
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
      custo: String(p.custo ?? ''),
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
      }
      if (form.custo !== '') {
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
          <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
            {isAdmin && (
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

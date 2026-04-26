'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ShoppingBag, DollarSign, Truck, ShoppingCart } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { Lote } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

interface LoteComContagem extends Lote {
  total_perfumes: number
}

const emptyForm = {
  data_compra: '',
  dolar: '',
  entrega: false,
  taxa_entrega: '',
  observacoes: '',
}

export default function LotesPage() {
  const supabase = createClient()
  const { isAdmin, profileLoading } = useAuth()

  const [lotes, setLotes] = useState<LoteComContagem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState<LoteComContagem | null>(null)
  const [editing, setEditing] = useState<Lote | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      const { data: lotesData } = await (supabase as any)
        .from('lotes')
        .select('*, perfumes(id)')
        .order('data_compra', { ascending: false })

      const mapped: LoteComContagem[] = ((lotesData ?? []) as any[]).map((l) => ({
        ...l,
        total_perfumes: Array.isArray(l.perfumes) ? l.perfumes.length : 0,
      }))
      setLotes(mapped)
    } catch {
      // erro de rede
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (l: LoteComContagem) => {
    setEditing(l)
    setForm({
      data_compra: l.data_compra,
      dolar: String(l.dolar),
      entrega: l.entrega,
      taxa_entrega: l.taxa_entrega != null ? String(l.taxa_entrega) : '',
      observacoes: l.observacoes ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.data_compra || !form.dolar) {
      toast.error('Preencha a data e o valor do dólar')
      return
    }
    if (form.entrega && !form.taxa_entrega) {
      toast.error('Informe a taxa de entrega')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        data_compra: form.data_compra,
        dolar: parseFloat(form.dolar),
        entrega: form.entrega,
        taxa_entrega: form.entrega && form.taxa_entrega ? parseFloat(form.taxa_entrega) : null,
        observacoes: form.observacoes.trim() || null,
      }

      if (editing) {
        const { error } = await (supabase as any)
          .from('lotes')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('Lote atualizado!')
      } else {
        const { error } = await (supabase as any).from('lotes').insert(payload)
        if (error) throw error
        toast.success('Lote cadastrado!')
      }

      setModalOpen(false)
      load()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setDeleting(true)
    try {
      const { error } = await (supabase as any)
        .from('lotes')
        .delete()
        .eq('id', deleteModal.id)
      if (error) throw error
      toast.success('Lote removido!')
      setDeleteModal(null)
      load()
    } catch {
      toast.error('Erro ao remover. Verifique se há perfumes vinculados.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text">Lotes de Compra</h1>
            <p className="text-brand-muted text-sm mt-1">
              Registre cada viagem ao Paraguai com câmbio e taxas
            </p>
          </div>
          {(profileLoading || isAdmin) && (
            <Button onClick={openNew} disabled={profileLoading}>
              <Plus size={16} />
              Novo Lote
            </Button>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-brand-card border border-brand-border rounded-xl p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : lotes.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum lote cadastrado ainda.</p>
            <p className="text-xs mt-1">Cadastre a primeira viagem ao Paraguai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lotes.map((lote) => (
              <div
                key={lote.id}
                className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Data e ícone */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
                    {lote.entrega ? (
                      <Truck size={18} className="text-brand-gold" />
                    ) : (
                      <ShoppingCart size={18} className="text-brand-gold" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-text">
                      {format(parseISO(lote.data_compra), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                      <span className="text-xs text-brand-muted flex items-center gap-1">
                        <DollarSign size={11} />
                        Dólar: <span className="text-brand-gold font-medium">
                          R$ {Number(lote.dolar).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                      </span>
                      <span className="text-xs text-brand-muted">·</span>
                      {lote.entrega ? (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Truck size={11} />
                          Entrega — taxa {lote.taxa_entrega}%
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <ShoppingCart size={11} />
                          Buscou pessoalmente
                        </span>
                      )}
                      {lote.total_perfumes > 0 && (
                        <>
                          <span className="text-xs text-brand-muted">·</span>
                          <span className="text-xs text-brand-muted">
                            {lote.total_perfumes} perfume{lote.total_perfumes !== 1 ? 's' : ''} vinculado{lote.total_perfumes !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    {lote.observacoes && (
                      <p className="text-xs text-brand-muted mt-1 italic truncate">{lote.observacoes}</p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(lote)}
                      className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteModal(lote)}
                      className="p-2 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-900/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal — novo/editar lote */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Lote' : 'Novo Lote'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Data da compra *"
            type="date"
            value={form.data_compra}
            onChange={(e) => setForm({ ...form, data_compra: e.target.value })}
            required
          />

          <Input
            label="Valor do dólar (R$) *"
            type="number"
            placeholder="ex: 5.85"
            min="0"
            step="0.0001"
            value={form.dolar}
            onChange={(e) => setForm({ ...form, dolar: e.target.value })}
            hint="Câmbio do dia da compra"
            required
          />

          {/* Toggle entrega */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-brand-text-dim">Tipo de aquisição</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, entrega: false, taxa_entrega: '' })}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                  !form.entrega
                    ? 'bg-brand-gold/10 border-brand-gold/50 text-brand-gold'
                    : 'bg-brand-card border-brand-border text-brand-muted hover:text-brand-text'
                }`}
              >
                <ShoppingCart size={14} />
                Buscou pessoalmente
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, entrega: true })}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                  form.entrega
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                    : 'bg-brand-card border-brand-border text-brand-muted hover:text-brand-text'
                }`}
              >
                <Truck size={14} />
                Entregaram pra ele
              </button>
            </div>
          </div>

          {/* Taxa de entrega — aparece só se entrega */}
          {form.entrega && (
            <Input
              label="Taxa da nota fiscal (%) *"
              type="number"
              placeholder="ex: 15"
              min="0"
              max="100"
              step="0.01"
              value={form.taxa_entrega}
              onChange={(e) => setForm({ ...form, taxa_entrega: e.target.value })}
              hint="Percentual acrescido ao custo de cada perfume do lote"
            />
          )}

          <Input
            label="Observações"
            placeholder="ex: Compra de março, lote do Dior..."
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />

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
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal — confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Remover Lote"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-brand-muted">
            Tem certeza que deseja remover o lote de{' '}
            <span className="text-brand-text font-medium">
              {deleteModal && format(parseISO(deleteModal.data_compra), "dd/MM/yyyy", { locale: ptBR })}
            </span>?
          </p>
          {deleteModal && deleteModal.total_perfumes > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-400">
              Atenção: {deleteModal.total_perfumes} perfume{deleteModal.total_perfumes !== 1 ? 's estão' : ' está'} vinculado{deleteModal.total_perfumes !== 1 ? 's' : ''} a este lote.
              O vínculo será removido mas os perfumes serão mantidos.
            </div>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setDeleteModal(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              className="flex-1"
              loading={deleting}
              onClick={handleDelete}
            >
              Remover
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

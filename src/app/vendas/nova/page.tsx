'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Check, ChevronLeft, Plus } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase'
import { Perfume, Cliente } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Step = 1 | 2 | 3

export default function NovaVendaPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [perfumes, setPerfumes] = useState<Perfume[]>([])
  const [searchPerfume, setSearchPerfume] = useState('')
  const [selectedPerfume, setSelectedPerfume] = useState<Perfume | null>(null)

  // Step 2
  const [quantidade, setQuantidade] = useState('1')
  const [precoPraticado, setPrecoPraticado] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchCliente, setSearchCliente] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTel, setNovoClienteTel] = useState('')
  const [showNewCliente, setShowNewCliente] = useState(false)

  // Step 3
  const [formaPagamento, setFormaPagamento] = useState<'a_vista' | 'parcelado' | 'fiado'>('a_vista')
  const [numParcelas, setNumParcelas] = useState('2')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('perfumes').select('*').eq('ativo', true).order('nome').then(({ data }) => {
      setPerfumes((data ?? []) as Perfume[])
    })
    supabase.from('clientes').select('*').order('nome').then(({ data }) => {
      setClientes((data ?? []) as Cliente[])
    })
  }, [])

  const perfumesFiltrados = perfumes.filter((p) => {
    const q = searchPerfume.toLowerCase()
    return p.nome.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q)
  })

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchCliente.toLowerCase())
  )

  const precoBase = selectedPerfume?.preco_base ?? 0
  const precoAtual = parseFloat(precoPraticado) || precoBase
  const qtdNum = parseInt(quantidade) || 1
  const desconto = Math.max(0, precoBase * qtdNum - precoAtual * qtdNum)
  const totalVenda = precoAtual * qtdNum

  const handleSelectPerfume = (p: Perfume) => {
    setSelectedPerfume(p)
    setPrecoPraticado(String(p.preco_base))
    setStep(2)
  }

  const handleStep2Next = () => {
    if (!selectedCliente && !novoClienteNome.trim()) {
      toast.error('Selecione ou cadastre um cliente')
      return
    }
    if (!quantidade || parseInt(quantidade) < 1) {
      toast.error('Informe a quantidade')
      return
    }
    if (selectedPerfume && parseInt(quantidade) > selectedPerfume.quantidade_estoque) {
      toast.error(`Estoque insuficiente. Disponível: ${selectedPerfume.quantidade_estoque} un`)
      return
    }
    setStep(3)
  }

  const handleSalvar = async () => {
    if (!user) { toast.error('Usuário não autenticado'); return }
    if (!selectedPerfume) return

    setSaving(true)
    try {
      // Criar cliente se novo
      let clienteId = selectedCliente?.id
      if (!clienteId) {
        const { data: novoCliente, error } = await (supabase as any)
          .from('clientes')
          .insert({
            nome: novoClienteNome.trim(),
            telefone_whatsapp: novoClienteTel.trim() || null,
          })
          .select()
          .single()
        if (error) throw error
        clienteId = novoCliente.id
      }

      // Verificar estoque novamente
      const { data: perfumeAtual } = await supabase
        .from('perfumes')
        .select('quantidade_estoque')
        .eq('id', selectedPerfume.id)
        .single()

      if (!perfumeAtual || perfumeAtual.quantidade_estoque < qtdNum) {
        toast.error('Estoque insuficiente no momento da confirmação!')
        setSaving(false)
        return
      }

      // Criar venda
      const { data: venda, error: vendaError } = await (supabase as any)
        .from('vendas')
        .insert({
          vendedor_id: user.id,
          cliente_id: clienteId,
          perfume_id: selectedPerfume.id,
          quantidade: qtdNum,
          preco_base_momento: precoBase,
          preco_praticado: precoAtual,
          desconto_aplicado: desconto,
          forma_pagamento: formaPagamento,
          status_pagamento: formaPagamento === 'a_vista' ? 'pago' : 'pendente',
          observacoes: observacoes.trim() || null,
        })
        .select()
        .single()

      if (vendaError) throw vendaError

      // Decrementar estoque
      const { error: estoqueError } = await (supabase as any)
        .from('perfumes')
        .update({ quantidade_estoque: perfumeAtual.quantidade_estoque - qtdNum })
        .eq('id', selectedPerfume.id)

      if (estoqueError) throw estoqueError

      // Criar parcelas
      if (formaPagamento === 'a_vista') {
        await (supabase as any).from('parcelas').insert({
          venda_id: venda.id,
          numero_parcela: 1,
          valor: totalVenda,
          data_vencimento: format(new Date(), 'yyyy-MM-dd'),
          data_pagamento: new Date().toISOString(),
          status: 'pago',
        })
      } else if (formaPagamento === 'parcelado') {
        const n = parseInt(numParcelas) || 2
        const valorParcela = totalVenda / n
        const parcelas = Array.from({ length: n }, (_, i) => ({
          venda_id: venda.id,
          numero_parcela: i + 1,
          valor: Math.round(valorParcela * 100) / 100,
          data_vencimento: format(addMonths(new Date(), i + 1), 'yyyy-MM-dd'),
          status: 'pendente',
        }))
        await (supabase as any).from('parcelas').insert(parcelas)
      } else {
        // Fiado
        await (supabase as any).from('parcelas').insert({
          venda_id: venda.id,
          numero_parcela: 1,
          valor: totalVenda,
          data_vencimento: null,
          status: 'pendente',
        })
      }

      toast.success('Venda registrada com sucesso!')
      router.push('/vendas')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao registrar venda. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => (step === 1 ? router.push('/vendas') : setStep((s) => (s - 1) as Step))}
            className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-text">Nova Venda</h1>
            <p className="text-brand-muted text-sm">
              Etapa {step} de 3
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                step >= s ? 'bg-brand-gold' : 'bg-brand-border'
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Perfume */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="font-medium text-brand-text">Selecionar perfume</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                placeholder="Buscar perfume..."
                value={searchPerfume}
                onChange={(e) => setSearchPerfume(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              {perfumesFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPerfume(p)}
                  disabled={p.quantidade_estoque === 0}
                  className={`
                    w-full flex items-center justify-between px-4 py-4 rounded-xl border text-left transition-all
                    ${p.quantidade_estoque === 0
                      ? 'opacity-40 cursor-not-allowed border-brand-border bg-brand-card'
                      : 'border-brand-border bg-brand-card hover:border-brand-gold/40 hover:bg-brand-surface active:scale-[0.99]'
                    }
                  `}
                >
                  <div>
                    <p className="font-medium text-brand-text">{p.nome}</p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {p.marca} · {p.tamanho_ml}ml
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-gold font-semibold">{formatCurrency(p.preco_base)}</p>
                    <p className={`text-xs mt-0.5 ${p.quantidade_estoque <= p.quantidade_minima_alerta ? 'text-red-400' : 'text-brand-muted'}`}>
                      {p.quantidade_estoque === 0 ? 'Sem estoque' : `${p.quantidade_estoque} disponíveis`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Quantidade, preço e cliente */}
        {step === 2 && selectedPerfume && (
          <div className="space-y-5 animate-fadeIn">
            {/* Selected perfume summary */}
            <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-text">{selectedPerfume.nome}</p>
                <p className="text-xs text-brand-muted">{selectedPerfume.marca} · {selectedPerfume.tamanho_ml}ml</p>
              </div>
              <p className="text-brand-gold font-semibold">{formatCurrency(selectedPerfume.preco_base)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantidade"
                type="number"
                min="1"
                max={selectedPerfume.quantidade_estoque}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                hint={`Máx: ${selectedPerfume.quantidade_estoque}`}
              />
              <Input
                label="Preço praticado (R$)"
                type="number"
                step="0.01"
                min="0"
                value={precoPraticado}
                onChange={(e) => setPrecoPraticado(e.target.value)}
              />
            </div>

            {/* Summary */}
            <div className="bg-brand-card border border-brand-border rounded-xl px-4 py-3 space-y-1.5">
              {desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Desconto</span>
                  <span className="text-amber-400">- {formatCurrency(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-brand-text">Total</span>
                <span className="font-bold text-brand-gold text-lg">{formatCurrency(totalVenda)}</span>
              </div>
            </div>

            {/* Cliente */}
            <div>
              <p className="text-sm font-medium text-brand-text-dim mb-2">Cliente</p>
              <div className="relative mb-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchCliente}
                  onChange={(e) => { setSearchCliente(e.target.value); setSelectedCliente(null) }}
                  className="w-full pl-9 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-gold/40"
                />
              </div>

              {selectedCliente ? (
                <div className="flex items-center justify-between bg-brand-gold/10 border border-brand-gold/30 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-medium text-brand-text">{selectedCliente.nome}</p>
                    {selectedCliente.telefone_whatsapp && (
                      <p className="text-xs text-brand-muted">{selectedCliente.telefone_whatsapp}</p>
                    )}
                  </div>
                  <Check size={16} className="text-brand-gold" />
                </div>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {clientesFiltrados.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCliente(c); setSearchCliente(c.nome); setShowNewCliente(false) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 bg-brand-card border border-brand-border rounded-lg hover:border-brand-gold/40 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-full bg-brand-surface flex items-center justify-center text-xs font-semibold text-brand-text-dim">
                        {c.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-brand-text">{c.nome}</p>
                        {c.telefone_whatsapp && (
                          <p className="text-xs text-brand-muted">{c.telefone_whatsapp}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowNewCliente(!showNewCliente)}
                className="flex items-center gap-2 text-sm text-brand-gold hover:text-brand-gold-dark mt-3"
              >
                <Plus size={14} />
                Novo cliente
              </button>

              {showNewCliente && (
                <div className="mt-3 space-y-3 animate-fadeIn">
                  <Input
                    label="Nome do cliente *"
                    placeholder="Nome completo"
                    value={novoClienteNome}
                    onChange={(e) => { setNovoClienteNome(e.target.value); setSelectedCliente(null) }}
                  />
                  <Input
                    label="WhatsApp"
                    placeholder="(41) 99999-9999"
                    value={novoClienteTel}
                    onChange={(e) => setNovoClienteTel(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Input
              label="Observações (opcional)"
              placeholder="Alguma anotação sobre a venda..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <Button className="w-full" size="lg" onClick={handleStep2Next}>
              Continuar
            </Button>
          </div>
        )}

        {/* Step 3 — Pagamento */}
        {step === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <h2 className="font-medium text-brand-text">Forma de pagamento</h2>

            {/* Summary */}
            <div className="bg-brand-card border border-brand-border rounded-xl px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">{selectedPerfume?.nome}</span>
                <span className="text-brand-text">{qtdNum}x {formatCurrency(precoAtual)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Desconto</span>
                  <span className="text-amber-400">- {formatCurrency(desconto)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-brand-border">
                <span className="text-brand-text">Total</span>
                <span className="text-brand-gold text-lg">{formatCurrency(totalVenda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Cliente</span>
                <span className="text-brand-text">
                  {selectedCliente?.nome ?? novoClienteNome}
                </span>
              </div>
            </div>

            {/* Payment options */}
            <div className="space-y-2">
              {(['a_vista', 'parcelado', 'fiado'] as const).map((forma) => {
                const labels = { a_vista: 'À vista', parcelado: 'Parcelado', fiado: 'Fiado' }
                const descs = {
                  a_vista: 'Pagamento imediato — marcado como pago',
                  parcelado: 'Dividir em parcelas mensais',
                  fiado: 'Registrar sem data — cobrar depois',
                }
                return (
                  <button
                    key={forma}
                    onClick={() => setFormaPagamento(forma)}
                    className={`
                      w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all
                      ${formaPagamento === forma
                        ? 'border-brand-gold/60 bg-brand-gold/10'
                        : 'border-brand-border bg-brand-card hover:border-brand-muted'
                      }
                    `}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formaPagamento === forma ? 'border-brand-gold' : 'border-brand-muted'
                    }`}>
                      {formaPagamento === forma && (
                        <div className="w-2 h-2 rounded-full bg-brand-gold" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-brand-text">{labels[forma]}</p>
                      <p className="text-xs text-brand-muted">{descs[forma]}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {formaPagamento === 'parcelado' && (
              <div className="animate-fadeIn">
                <Input
                  label="Número de parcelas"
                  type="number"
                  min="2"
                  max="24"
                  value={numParcelas}
                  onChange={(e) => setNumParcelas(e.target.value)}
                  hint={`${formatCurrency(totalVenda / (parseInt(numParcelas) || 2))} por parcela`}
                />
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              loading={saving}
              onClick={handleSalvar}
            >
              Confirmar venda
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

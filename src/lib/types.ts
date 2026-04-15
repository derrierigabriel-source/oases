export interface Perfume {
  id: string
  nome: string
  marca: string
  tamanho_ml: number
  quantidade_estoque: number
  preco_base: number
  foto_url: string | null
  quantidade_minima_alerta: number
  ativo: boolean
  criado_em: string
}

export interface Vendedor {
  id: string
  nome: string
  telefone: string | null
  perfil: 'admin' | 'vendedor'
  ativo: boolean
  criado_em: string
}

export interface Cliente {
  id: string
  nome: string
  telefone_whatsapp: string | null
  observacoes: string | null
  criado_em: string
}

export interface Venda {
  id: string
  data_venda: string
  vendedor_id: string
  cliente_id: string
  perfume_id: string
  quantidade: number
  preco_base_momento: number
  preco_praticado: number
  desconto_aplicado: number
  forma_pagamento: 'a_vista' | 'parcelado' | 'fiado'
  status_pagamento: 'pago' | 'pendente' | 'parcial'
  observacoes: string | null
  criado_em: string
  // joins
  vendedor?: Vendedor
  cliente?: Cliente
  perfume?: Perfume
  parcelas?: Parcela[]
}

export interface Parcela {
  id: string
  venda_id: string
  numero_parcela: number
  valor: number
  data_vencimento: string | null
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'atrasado'
  criado_em: string
  // joins
  venda?: Venda
}

export type FormaPagamento = 'a_vista' | 'parcelado' | 'fiado'
export type StatusPagamento = 'pago' | 'pendente' | 'parcial'
export type StatusParcela = 'pendente' | 'pago' | 'atrasado'
export type PerfilVendedor = 'admin' | 'vendedor'

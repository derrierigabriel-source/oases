# Perfumes App — Sistema de Gestão de Vendas

Sistema completo para gerenciar estoque, vendas e cobranças de uma loja de perfumes.

---

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (banco de dados, autenticação e RLS)
- **Lucide React** (ícones)
- **React Hot Toast** (notificações)
- **date-fns** (datas)

---

## Pré-requisitos

- Node.js 18+
- Conta gratuita no [Supabase](https://supabase.com)

---

## Configuração do Supabase

### 1. Criar projeto

1. Acesse [supabase.com](https://supabase.com) e clique em **New Project**
2. Escolha um nome (ex: `perfumes-app`) e defina uma senha forte para o banco
3. Aguarde o projeto ser criado (~1 min)

### 2. Rodar o schema

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Cole o conteúdo do arquivo `supabase/schema.sql`
4. Clique em **Run**

### 3. Pegar as chaves

1. Vá em **Settings → API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e preencha com as chaves copiadas acima:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Criar o primeiro usuário admin

### Passo 1 — Criar usuário no Supabase Auth

1. Vá em **Authentication → Users**
2. Clique em **Add user → Create new user**
3. Informe email e senha
4. Clique em **Create User**
5. Copie o **User UID** gerado

### Passo 2 — Inserir na tabela vendedores

1. Vá em **Table Editor → vendedores**
2. Clique em **Insert row**
3. Preencha:
   - `id`: cole o UID copiado
   - `nome`: nome do admin
   - `perfil`: `admin`
   - `ativo`: `true`
4. Salve

Pronto! Acesse o app com as credenciais criadas.

---

## Funcionalidades

| Página | Descrição |
|---|---|
| `/dashboard` | Visão geral: estoque, vendas do dia, total a receber |
| `/estoque` | Cadastro e controle de perfumes |
| `/vendas` | Histórico de vendas com filtros |
| `/vendas/nova` | Wizard em 3 etapas para registrar venda |
| `/clientes` | Cadastro de clientes com histórico e saldo |
| `/pagamentos` | Controle de parcelas: pendentes, atrasadas, pagas |

---

## Estrutura de pastas

```
src/
├── app/                  ← Páginas (Next.js App Router)
│   ├── login/
│   ├── dashboard/
│   ├── estoque/
│   ├── vendas/
│   │   └── nova/
│   ├── clientes/
│   └── pagamentos/
├── components/
│   ├── layout/           ← AppLayout, Sidebar
│   ├── ui/               ← Button, Input, Badge, Modal
│   └── dashboard/        ← StatCard
├── hooks/
│   └── useAuth.ts
└── lib/
    ├── supabase.ts
    └── types.ts
```

---

## Comandos

```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Iniciar build
npm run lint     # Lint
```

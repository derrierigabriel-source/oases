-- =============================================
-- PERFUMES APP — Schema Supabase
-- =============================================

-- Perfumes (produtos)
create table perfumes (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  marca text not null,
  tamanho_ml integer not null,
  quantidade_estoque integer not null default 0,
  preco_base numeric(10,2) not null,
  custo numeric(10,2),
  foto_url text,
  quantidade_minima_alerta integer not null default 2,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- ⚠ Para bancos JÁ EXISTENTES, execute também:
-- alter table perfumes add column if not exists custo numeric(10,2);

-- Vendedores (usuários do sistema)
create table vendedores (
  id uuid references auth.users(id) primary key,
  nome text not null,
  telefone text,
  perfil text not null check (perfil in ('admin', 'vendedor')),
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Clientes
create table clientes (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  telefone_whatsapp text,
  observacoes text,
  criado_em timestamptz default now()
);

-- Vendas
create table vendas (
  id uuid default gen_random_uuid() primary key,
  data_venda timestamptz default now(),
  vendedor_id uuid references vendedores(id) not null,
  cliente_id uuid references clientes(id) not null,
  perfume_id uuid references perfumes(id) not null,
  quantidade integer not null,
  preco_base_momento numeric(10,2) not null,
  preco_praticado numeric(10,2) not null,
  desconto_aplicado numeric(10,2) default 0,
  forma_pagamento text not null check (forma_pagamento in ('a_vista', 'parcelado', 'fiado')),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pago', 'pendente', 'parcial')),
  observacoes text,
  criado_em timestamptz default now()
);

-- Parcelas
create table parcelas (
  id uuid default gen_random_uuid() primary key,
  venda_id uuid references vendas(id) on delete cascade not null,
  numero_parcela integer not null,
  valor numeric(10,2) not null,
  data_vencimento date,
  data_pagamento timestamptz,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  criado_em timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table perfumes enable row level security;
alter table vendedores enable row level security;
alter table clientes enable row level security;
alter table vendas enable row level security;
alter table parcelas enable row level security;

-- =============================================
-- HELPER: checar se usuário logado é admin
-- =============================================
-- Usado nas policies como:
--   (select perfil from vendedores where id = auth.uid()) = 'admin'

-- =============================================
-- POLICIES — PERFUMES
-- =============================================
drop policy if exists "Autenticados podem ler perfumes" on perfumes;
drop policy if exists "Autenticados podem inserir perfumes" on perfumes;
drop policy if exists "Autenticados podem atualizar perfumes" on perfumes;
drop policy if exists "Autenticados podem deletar perfumes" on perfumes;

-- Todos os autenticados visualizam (catálogo de produtos)
create policy "Autenticados podem ler perfumes" on perfumes
  for select using (auth.role() = 'authenticated');

-- Apenas admin pode criar, editar e deletar perfumes
create policy "Admin pode inserir perfumes" on perfumes
  for insert with check (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

create policy "Admin pode atualizar perfumes" on perfumes
  for update using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

create policy "Admin pode deletar perfumes" on perfumes
  for delete using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

-- =============================================
-- POLICIES — CLIENTES
-- =============================================
drop policy if exists "Autenticados podem ler clientes" on clientes;
drop policy if exists "Autenticados podem inserir clientes" on clientes;
drop policy if exists "Autenticados podem atualizar clientes" on clientes;
drop policy if exists "Autenticados podem deletar clientes" on clientes;

-- Admin vê todos; vendedor vê apenas clientes das suas próprias vendas
create policy "Admin lê todos os clientes" on clientes
  for select using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

create policy "Vendedor lê seus clientes" on clientes
  for select using (
    exists (
      select 1 from vendas
      where vendas.cliente_id = clientes.id
        and vendas.vendedor_id = auth.uid()
    )
  );

-- Todos os autenticados podem criar clientes (necessário ao registrar uma venda)
create policy "Autenticados podem inserir clientes" on clientes
  for insert with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar clientes" on clientes
  for update using (auth.role() = 'authenticated');

-- Apenas admin pode deletar clientes
create policy "Admin pode deletar clientes" on clientes
  for delete using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

-- =============================================
-- POLICIES — VENDAS
-- =============================================
drop policy if exists "Autenticados podem ler vendas" on vendas;
drop policy if exists "Autenticados podem inserir vendas" on vendas;
drop policy if exists "Autenticados podem atualizar vendas" on vendas;
drop policy if exists "Autenticados podem deletar vendas" on vendas;

-- Admin vê todas; vendedor vê apenas as suas
create policy "Admin lê todas as vendas" on vendas
  for select using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

create policy "Vendedor lê suas vendas" on vendas
  for select using (vendedor_id = auth.uid());

-- Vendedor só pode criar venda com seu próprio id
create policy "Vendedor insere suas vendas" on vendas
  for insert with check (vendedor_id = auth.uid());

-- Vendedor pode atualizar suas vendas; admin pode atualizar todas
create policy "Vendedor atualiza suas vendas" on vendas
  for update using (
    vendedor_id = auth.uid()
    or (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

-- Apenas admin pode deletar vendas
create policy "Admin pode deletar vendas" on vendas
  for delete using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

-- =============================================
-- POLICIES — PARCELAS
-- =============================================
drop policy if exists "Autenticados podem ler parcelas" on parcelas;
drop policy if exists "Autenticados podem inserir parcelas" on parcelas;
drop policy if exists "Autenticados podem atualizar parcelas" on parcelas;
drop policy if exists "Autenticados podem deletar parcelas" on parcelas;

-- Admin vê todas; vendedor vê apenas parcelas das suas vendas
create policy "Admin lê todas as parcelas" on parcelas
  for select using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

create policy "Vendedor lê suas parcelas" on parcelas
  for select using (
    exists (
      select 1 from vendas
      where vendas.id = parcelas.venda_id
        and vendas.vendedor_id = auth.uid()
    )
  );

-- Inserir/atualizar parcelas permitido para quem é dono da venda ou admin
create policy "Insere parcelas de suas vendas" on parcelas
  for insert with check (
    exists (
      select 1 from vendas
      where vendas.id = parcelas.venda_id
        and (vendas.vendedor_id = auth.uid()
          or (select perfil from vendedores where id = auth.uid()) = 'admin')
    )
  );

create policy "Atualiza parcelas de suas vendas" on parcelas
  for update using (
    exists (
      select 1 from vendas
      where vendas.id = parcelas.venda_id
        and (vendas.vendedor_id = auth.uid()
          or (select perfil from vendedores where id = auth.uid()) = 'admin')
    )
  );

-- Apenas admin pode deletar parcelas
create policy "Admin pode deletar parcelas" on parcelas
  for delete using (
    (select perfil from vendedores where id = auth.uid()) = 'admin'
  );

-- =============================================
-- POLICIES — VENDEDORES
-- =============================================
drop policy if exists "Autenticados podem ler vendedores" on vendedores;
drop policy if exists "Vendedor pode inserir seu registro" on vendedores;
drop policy if exists "Vendedor pode atualizar seu registro" on vendedores;

create policy "Autenticados podem ler vendedores" on vendedores
  for select using (auth.role() = 'authenticated');

create policy "Vendedor pode inserir seu registro" on vendedores
  for insert with check (auth.uid() = id);

create policy "Vendedor pode atualizar seu registro" on vendedores
  for update using (auth.uid() = id);

-- =============================================
-- FUNÇÃO: Atualizar status da venda automaticamente
-- =============================================
create or replace function atualizar_status_venda()
returns trigger as $$
declare
  total_parcelas integer;
  parcelas_pagas integer;
begin
  select count(*) into total_parcelas from parcelas where venda_id = NEW.venda_id;
  select count(*) into parcelas_pagas from parcelas where venda_id = NEW.venda_id and status = 'pago';

  if parcelas_pagas = total_parcelas then
    update vendas set status_pagamento = 'pago' where id = NEW.venda_id;
  elsif parcelas_pagas > 0 then
    update vendas set status_pagamento = 'parcial' where id = NEW.venda_id;
  else
    update vendas set status_pagamento = 'pendente' where id = NEW.venda_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_atualizar_status_venda on parcelas;

create trigger trigger_atualizar_status_venda
after update on parcelas
for each row
execute function atualizar_status_venda();

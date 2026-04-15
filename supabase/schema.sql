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
  foto_url text,
  quantidade_minima_alerta integer not null default 2,
  ativo boolean default true,
  criado_em timestamptz default now()
);

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

-- Políticas de leitura
create policy "Autenticados podem ler perfumes" on perfumes
  for select using (auth.role() = 'authenticated');

create policy "Autenticados podem ler vendedores" on vendedores
  for select using (auth.role() = 'authenticated');

create policy "Autenticados podem ler clientes" on clientes
  for select using (auth.role() = 'authenticated');

create policy "Autenticados podem ler vendas" on vendas
  for select using (auth.role() = 'authenticated');

create policy "Autenticados podem ler parcelas" on parcelas
  for select using (auth.role() = 'authenticated');

-- Políticas de escrita
create policy "Autenticados podem inserir perfumes" on perfumes
  for insert with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar perfumes" on perfumes
  for update using (auth.role() = 'authenticated');

create policy "Autenticados podem inserir clientes" on clientes
  for insert with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar clientes" on clientes
  for update using (auth.role() = 'authenticated');

create policy "Autenticados podem inserir vendas" on vendas
  for insert with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar vendas" on vendas
  for update using (auth.role() = 'authenticated');

create policy "Autenticados podem inserir parcelas" on parcelas
  for insert with check (auth.role() = 'authenticated');

create policy "Autenticados podem atualizar parcelas" on parcelas
  for update using (auth.role() = 'authenticated');

-- Vendedores: apenas o próprio usuário pode inserir/atualizar seu registro
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

create trigger trigger_atualizar_status_venda
after update on parcelas
for each row
execute function atualizar_status_venda();

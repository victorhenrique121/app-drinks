-- =============================================================================
-- COPO CERTO — Esquema completo do banco (Supabase / PostgreSQL)
-- Execute este arquivo inteiro no SQL Editor do Supabase (é idempotente o
-- suficiente para ser reexecutado em desenvolvimento).
--
-- Segurança em camadas:
--   1. Constraints (CHECK / UNIQUE / FK)      -> integridade dos dados
--   2. Triggers                               -> autor_id nunca vem do cliente,
--                                                regras de compatibilidade
--   3. RPCs transacionais                     -> criação/edição atômicas
--   4. Row Level Security                     -> quem pode ler/escrever o quê
--   5. Storage policies                       -> cada usuário só mexe na sua pasta
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABELAS
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (char_length(btrim(nome)) between 1 and 80),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 1000),
  created_at  timestamptz not null default now()
);

create table if not exists public.ingredients (
  id         bigint generated always as identity primary key,
  nome       text not null unique check (char_length(btrim(nome)) between 1 and 80),
  categoria  text not null check (categoria in (
               'alcool','destilado','licor','laticinio','acido_forte','estimulante',
               'fruta','suco','refrigerante','xarope','agua','outro')),
  descricao  text check (descricao is null or char_length(descricao) <= 300)
);

create table if not exists public.drinks (
  id                            uuid primary key default gen_random_uuid(),
  autor_id                      uuid not null default auth.uid()
                                  references public.profiles (id) on delete cascade,
  nome                          text not null check (char_length(btrim(nome)) between 3 and 80),
  descricao                     text check (descricao is null or char_length(descricao) <= 500),
  modo_preparo                  text not null check (char_length(btrim(modo_preparo)) between 10 and 4000),
  url_imagem                    text,
  tipo                          text not null check (tipo in ('drink','mocktail')),
  publico                       boolean not null default true,
  -- Registro de que o autor confirmou explicitamente o aviso álcool + estimulante.
  aviso_estimulante_confirmado  boolean not null default false,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

create table if not exists public.drink_ingredients (
  id             bigint generated always as identity primary key,
  drink_id       uuid   not null references public.drinks (id) on delete cascade,
  ingredient_id  bigint not null references public.ingredients (id) on delete restrict,
  quantidade     numeric(10,2),
  unidade        text not null check (unidade in (
                   'ml','cl','oz','dash','gota','colher_cha','colher_sopa',
                   'unidade','fatia','folha','g','a_gosto')),
  ordem          integer not null default 0 check (ordem between 0 and 100),
  -- Quantidade obrigatória e positiva, exceto para "a gosto".
  constraint drink_ingredients_quantidade_valida check (
    (unidade = 'a_gosto' and quantidade is null)
    or (unidade <> 'a_gosto' and quantidade is not null and quantidade > 0 and quantidade <= 5000)
  ),
  -- Impede o mesmo ingrediente duas vezes na mesma receita.
  constraint drink_ingredients_sem_duplicados unique (drink_id, ingredient_id)
);

create table if not exists public.saved_drinks (
  id          bigint generated always as identity primary key,
  -- user_id é preenchido pelo banco: o cliente não precisa (nem deve) enviá-lo.
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  drink_id    uuid not null references public.drinks (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint saved_drinks_user_drink_unique unique (user_id, drink_id)
);

create index if not exists drinks_autor_idx          on public.drinks (autor_id);
create index if not exists drinks_created_idx        on public.drinks (created_at desc);
create index if not exists drink_ingredients_drink_idx on public.drink_ingredients (drink_id);
create index if not exists saved_drinks_user_idx     on public.saved_drinks (user_id);
create index if not exists saved_drinks_drink_idx    on public.saved_drinks (drink_id);

-- -----------------------------------------------------------------------------
-- 2. PERFIL AUTOMÁTICO AO CRIAR USUÁRIO (e-mail ou Google)
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    ), 80),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 3. DRINKS: autor_id / timestamps / URL da imagem nunca confiam no cliente
-- -----------------------------------------------------------------------------

create or replace function public.drinks_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Em requisições autenticadas o autor é SEMPRE o usuário do JWT.
    new.autor_id   := coalesce(auth.uid(), new.autor_id);
    new.created_at := now();
  else
    -- autor e data de criação são imutáveis.
    new.autor_id   := old.autor_id;
    new.created_at := old.created_at;
  end if;

  new.updated_at := now();
  new.nome       := btrim(new.nome);
  new.descricao  := nullif(btrim(coalesce(new.descricao, '')), '');

  -- A imagem só pode apontar para {autor_id}/{drink_id}.jpg no bucket drink-images.
  if new.url_imagem is not null and new.url_imagem !~ (
       '/storage/v1/object/public/drink-images/' || new.autor_id::text || '/' || new.id::text || '\.jpg(\?v=[0-9]+)?$'
     ) then
    raise exception 'CC_IMAGEM_INVALIDA' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists drinks_before_write on public.drinks;
create trigger drinks_before_write
  before insert or update on public.drinks
  for each row execute function public.drinks_before_write();

-- -----------------------------------------------------------------------------
-- 4. REGRAS DE COMPATIBILIDADE (espelham src/utils/compatibility.ts)
-- -----------------------------------------------------------------------------

-- Conversão aproximada para ml. Mantenha em sincronia com UNIT_TO_ML no frontend.
create or replace function public.to_ml(q numeric, u text)
returns numeric
language sql
immutable
as $$
  select case u
    when 'ml'          then q
    when 'cl'          then q * 10
    when 'oz'          then q * 30
    when 'dash'        then q * 1
    when 'gota'        then q * 0.05
    when 'colher_cha'  then q * 5
    when 'colher_sopa' then q * 15
    when 'g'           then q
    when 'unidade'     then q * 30
    when 'fatia'       then q * 5
    else 0
  end
$$;

-- Limite: volume de ácido forte <= 50% do volume de laticínio.
create or replace function public.validate_drink_composition(p_drink_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo            text;
  v_confirmado      boolean;
  v_total           integer;
  v_acido_ml        numeric;
  v_laticinio_ml    numeric;
  v_tem_acido       boolean;
  v_tem_laticinio   boolean;
  v_tem_alcool      boolean;
  v_tem_estimulante boolean;
  v_nao_mensuravel  boolean;
  c_max_ratio constant numeric := 0.5;
begin
  select d.tipo, d.aviso_estimulante_confirmado
    into v_tipo, v_confirmado
    from public.drinks d
   where d.id = p_drink_id;

  if not found then
    return; -- drink removido (cascade): nada a validar
  end if;

  select count(*),
         coalesce(sum(public.to_ml(di.quantidade, di.unidade)) filter (where i.categoria = 'acido_forte'), 0),
         coalesce(sum(public.to_ml(di.quantidade, di.unidade)) filter (where i.categoria = 'laticinio'), 0),
         coalesce(bool_or(i.categoria = 'acido_forte'), false),
         coalesce(bool_or(i.categoria = 'laticinio'), false),
         coalesce(bool_or(i.categoria in ('alcool','destilado','licor')), false),
         coalesce(bool_or(i.categoria = 'estimulante'), false),
         coalesce(bool_or(i.categoria in ('acido_forte','laticinio') and di.unidade in ('a_gosto','folha')), false)
    into v_total, v_acido_ml, v_laticinio_ml, v_tem_acido, v_tem_laticinio,
         v_tem_alcool, v_tem_estimulante, v_nao_mensuravel
    from public.drink_ingredients di
    join public.ingredients i on i.id = di.ingredient_id
   where di.drink_id = p_drink_id;

  if v_total = 0 then
    raise exception 'CC_SEM_INGREDIENTES' using errcode = 'P0001';
  end if;

  if v_total > 30 then
    raise exception 'CC_MUITOS_INGREDIENTES' using errcode = 'P0001';
  end if;

  if v_tipo = 'mocktail' and v_tem_alcool then
    raise exception 'CC_MOCKTAIL_COM_ALCOOL' using errcode = 'P0001';
  end if;

  if v_tem_acido and v_tem_laticinio then
    if v_nao_mensuravel then
      raise exception 'CC_QUANTIDADE_NAO_MENSURAVEL' using errcode = 'P0001';
    end if;
    if v_laticinio_ml = 0 or (v_acido_ml / v_laticinio_ml) > c_max_ratio then
      raise exception 'CC_ACIDO_LATICINIO' using errcode = 'P0001';
    end if;
  end if;

  if v_tem_alcool and v_tem_estimulante and not v_confirmado then
    raise exception 'CC_CONFIRMACAO_ESTIMULANTE' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.validate_drink_composition(uuid) from public, anon, authenticated;

-- Triggers de restrição ADIADOS: validam o estado final da transação,
-- mesmo que alguém tente inserir/alterar linhas diretamente pela API.
create or replace function public.trg_validate_from_ingredients()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform public.validate_drink_composition(old.drink_id);
  end if;
  if tg_op in ('INSERT','UPDATE') and (tg_op = 'INSERT' or new.drink_id <> old.drink_id) then
    perform public.validate_drink_composition(new.drink_id);
  end if;
  return null;
end;
$$;

create or replace function public.trg_validate_from_drinks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.validate_drink_composition(new.id);
  return null;
end;
$$;

drop trigger if exists drink_ingredients_validate on public.drink_ingredients;
create constraint trigger drink_ingredients_validate
  after insert or update or delete on public.drink_ingredients
  deferrable initially deferred
  for each row execute function public.trg_validate_from_ingredients();

drop trigger if exists drinks_validate on public.drinks;
create constraint trigger drinks_validate
  after insert or update on public.drinks
  deferrable initially deferred
  for each row execute function public.trg_validate_from_drinks();

-- -----------------------------------------------------------------------------
-- 5. RPCs TRANSACIONAIS (security invoker => RLS continua valendo)
-- -----------------------------------------------------------------------------

create or replace function public.create_drink(
  p_nome             text,
  p_descricao        text,
  p_modo_preparo     text,
  p_tipo             text,
  p_publico          boolean,
  p_confirmou_aviso  boolean,
  p_ingredientes     jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'CC_NAO_AUTENTICADO' using errcode = '42501';
  end if;

  if p_ingredientes is null or jsonb_typeof(p_ingredientes) <> 'array'
     or jsonb_array_length(p_ingredientes) = 0 then
    raise exception 'CC_SEM_INGREDIENTES' using errcode = 'P0001';
  end if;

  insert into public.drinks (autor_id, nome, descricao, modo_preparo, tipo, publico, aviso_estimulante_confirmado)
  values (v_uid, p_nome, p_descricao, p_modo_preparo, p_tipo,
          coalesce(p_publico, true), coalesce(p_confirmou_aviso, false))
  returning id into v_id;

  insert into public.drink_ingredients (drink_id, ingredient_id, quantidade, unidade, ordem)
  select v_id,
         (x ->> 'ingredient_id')::bigint,
         nullif(x ->> 'quantidade', '')::numeric,
         x ->> 'unidade',
         (ord - 1)::integer
    from jsonb_array_elements(p_ingredientes) with ordinality as t(x, ord);

  -- Executa agora as validações adiadas: se algo falhar, NADA é gravado.
  set constraints all immediate;

  return v_id;
end;
$$;

create or replace function public.update_drink(
  p_id               uuid,
  p_nome             text,
  p_descricao        text,
  p_modo_preparo     text,
  p_tipo             text,
  p_publico          boolean,
  p_confirmou_aviso  boolean,
  p_ingredientes     jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'CC_NAO_AUTENTICADO' using errcode = '42501';
  end if;

  if p_ingredientes is null or jsonb_typeof(p_ingredientes) <> 'array'
     or jsonb_array_length(p_ingredientes) = 0 then
    raise exception 'CC_SEM_INGREDIENTES' using errcode = 'P0001';
  end if;

  update public.drinks
     set nome = p_nome,
         descricao = p_descricao,
         modo_preparo = p_modo_preparo,
         tipo = p_tipo,
         publico = coalesce(p_publico, true),
         aviso_estimulante_confirmado = coalesce(p_confirmou_aviso, false)
   where id = p_id
     and autor_id = v_uid;

  if not found then
    raise exception 'CC_SEM_PERMISSAO' using errcode = '42501';
  end if;

  delete from public.drink_ingredients where drink_id = p_id;

  insert into public.drink_ingredients (drink_id, ingredient_id, quantidade, unidade, ordem)
  select p_id,
         (x ->> 'ingredient_id')::bigint,
         nullif(x ->> 'quantidade', '')::numeric,
         x ->> 'unidade',
         (ord - 1)::integer
    from jsonb_array_elements(p_ingredientes) with ordinality as t(x, ord);

  set constraints all immediate;

  return p_id;
end;
$$;

revoke all on function public.create_drink(text,text,text,text,boolean,boolean,jsonb) from public, anon;
revoke all on function public.update_drink(uuid,text,text,text,text,boolean,boolean,jsonb) from public, anon;
grant execute on function public.create_drink(text,text,text,text,boolean,boolean,jsonb) to authenticated;
grant execute on function public.update_drink(uuid,text,text,text,text,boolean,boolean,jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. VIEWS PÚBLICAS SOMENTE COM DADOS NÃO SENSÍVEIS
--    (rodam com os privilégios do dono para expor apenas estas colunas;
--     a tabela profiles continua restrita ao próprio usuário)
-- -----------------------------------------------------------------------------

create or replace view public.public_profiles as
  select p.id, p.nome, p.avatar_url
    from public.profiles p;

create or replace view public.drink_popularity as
  select s.drink_id, count(*)::integer as total_favoritos
    from public.saved_drinks s
    join public.drinks d on d.id = s.drink_id
   where d.publico
   group by s.drink_id;

revoke all on public.public_profiles, public.drink_popularity from anon, authenticated;
grant select on public.public_profiles, public.drink_popularity to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.ingredients       enable row level security;
alter table public.drinks            enable row level security;
alter table public.drink_ingredients enable row level security;
alter table public.saved_drinks      enable row level security;

-- PROFILES: cada usuário vê e edita somente o próprio perfil.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- (sem INSERT/DELETE: perfis são criados pelo trigger e removidos em cascata)

-- INGREDIENTS: leitura pública; escrita apenas por administradores (SQL/painel).
drop policy if exists "ingredients_select_all" on public.ingredients;
create policy "ingredients_select_all" on public.ingredients
  for select to anon, authenticated using (true);

-- DRINKS
drop policy if exists "drinks_select_public_or_own" on public.drinks;
create policy "drinks_select_public_or_own" on public.drinks
  for select to anon, authenticated using (publico or autor_id = auth.uid());

drop policy if exists "drinks_insert_own" on public.drinks;
create policy "drinks_insert_own" on public.drinks
  for insert to authenticated with check (autor_id = auth.uid());

drop policy if exists "drinks_update_own" on public.drinks;
create policy "drinks_update_own" on public.drinks
  for update to authenticated using (autor_id = auth.uid()) with check (autor_id = auth.uid());

drop policy if exists "drinks_delete_own" on public.drinks;
create policy "drinks_delete_own" on public.drinks
  for delete to authenticated using (autor_id = auth.uid());

-- DRINK_INGREDIENTS: leitura segue a visibilidade do drink; escrita só do autor.
drop policy if exists "drink_ingredients_select" on public.drink_ingredients;
create policy "drink_ingredients_select" on public.drink_ingredients
  for select to anon, authenticated using (
    exists (select 1 from public.drinks d
             where d.id = drink_id and (d.publico or d.autor_id = auth.uid()))
  );

drop policy if exists "drink_ingredients_insert_own" on public.drink_ingredients;
create policy "drink_ingredients_insert_own" on public.drink_ingredients
  for insert to authenticated with check (
    exists (select 1 from public.drinks d where d.id = drink_id and d.autor_id = auth.uid())
  );

drop policy if exists "drink_ingredients_update_own" on public.drink_ingredients;
create policy "drink_ingredients_update_own" on public.drink_ingredients
  for update to authenticated
  using (exists (select 1 from public.drinks d where d.id = drink_id and d.autor_id = auth.uid()))
  with check (exists (select 1 from public.drinks d where d.id = drink_id and d.autor_id = auth.uid()));

drop policy if exists "drink_ingredients_delete_own" on public.drink_ingredients;
create policy "drink_ingredients_delete_own" on public.drink_ingredients
  for delete to authenticated using (
    exists (select 1 from public.drinks d where d.id = drink_id and d.autor_id = auth.uid())
  );

-- SAVED_DRINKS: somente os próprios favoritos, e somente de drinks visíveis.
drop policy if exists "saved_drinks_select_own" on public.saved_drinks;
create policy "saved_drinks_select_own" on public.saved_drinks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "saved_drinks_insert_own" on public.saved_drinks;
create policy "saved_drinks_insert_own" on public.saved_drinks
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.drinks d where d.id = drink_id)
  );

drop policy if exists "saved_drinks_delete_own" on public.saved_drinks;
create policy "saved_drinks_delete_own" on public.saved_drinks
  for delete to authenticated using (user_id = auth.uid());
-- (sem UPDATE: favoritos não são editáveis)

-- -----------------------------------------------------------------------------
-- 8. STORAGE — bucket drink-images, caminho {user_id}/{drink_id}.jpg
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drink-images', 'drink-images', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura das imagens é feita pela URL pública do bucket.
-- Via API, o usuário só enxerga (lista) a própria pasta — necessário para upsert.
drop policy if exists "drink_images_select_own" on storage.objects;
create policy "drink_images_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'drink-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload: somente na própria pasta, nome = id de um drink do próprio usuário.
drop policy if exists "drink_images_insert_own" on storage.objects;
create policy "drink_images_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'drink-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
    and exists (
      select 1 from public.drinks d
       where d.id::text = split_part(storage.filename(name), '.', 1)
         and d.autor_id = auth.uid()
    )
  );

-- Sobrescrever: somente arquivos da própria pasta.
drop policy if exists "drink_images_update_own" on storage.objects;
create policy "drink_images_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'drink-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'drink-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Excluir: somente arquivos da própria pasta.
drop policy if exists "drink_images_delete_own" on storage.objects;
create policy "drink_images_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'drink-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 9. SEED DE INGREDIENTES (categorias definem as regras de segurança)
--    Mantenha a mesma ordem de src/services/demo/seed.ts para ids equivalentes.
-- -----------------------------------------------------------------------------

insert into public.ingredients (nome, categoria, descricao) values
  ('Vodka',                 'destilado',   'Destilado neutro, cerca de 40% de álcool.'),
  ('Gin',                   'destilado',   'Destilado aromatizado com zimbro.'),
  ('Rum branco',            'destilado',   'Destilado de cana, leve e seco.'),
  ('Rum ouro',              'destilado',   'Rum envelhecido, notas de baunilha.'),
  ('Cachaça',               'destilado',   'Destilado brasileiro de cana-de-açúcar.'),
  ('Tequila',               'destilado',   'Destilado de agave azul.'),
  ('Whisky',                'destilado',   'Destilado de cereais envelhecido em barril.'),
  ('Conhaque',              'destilado',   'Destilado de vinho envelhecido.'),
  ('Licor de laranja',      'licor',       'Licor cítrico (estilo triple sec).'),
  ('Licor de café',         'licor',       'Licor adocicado de café. Contém álcool.'),
  ('Amaretto',              'licor',       'Licor de amêndoas.'),
  ('Campari',               'licor',       'Bitter italiano, amargo e vermelho.'),
  ('Aperol',                'licor',       'Bitter de laranja, leve e amargo.'),
  ('Licor de creme irlandês','licor',      'Licor cremoso à base de whisky.'),
  ('Vermute rosso',         'alcool',      'Vinho fortificado e aromatizado.'),
  ('Espumante',             'alcool',      'Vinho espumante seco.'),
  ('Vinho tinto',           'alcool',      'Vinho tinto seco.'),
  ('Vinho branco',          'alcool',      'Vinho branco seco.'),
  ('Cerveja',               'alcool',      'Cerveja tipo lager.'),
  ('Saquê',                 'alcool',      'Fermentado de arroz japonês.'),
  ('Angostura bitters',     'alcool',      'Bitter aromático concentrado (usado em dashes).'),
  ('Leite',                 'laticinio',   'Leite integral.'),
  ('Leite condensado',      'laticinio',   'Leite concentrado e adoçado.'),
  ('Creme de leite',        'laticinio',   'Creme de leite fresco ou de caixinha.'),
  ('Iogurte natural',       'laticinio',   'Iogurte integral sem açúcar.'),
  ('Sorvete de creme',      'laticinio',   'Sorvete à base de leite.'),
  ('Limão taiti',           'acido_forte', 'Limão verde, muito ácido.'),
  ('Suco de limão',         'acido_forte', 'Suco de limão espremido na hora.'),
  ('Limão siciliano',       'acido_forte', 'Limão amarelo, ácido e aromático.'),
  ('Vinagre de maçã',       'acido_forte', 'Vinagre usado em shrubs.'),
  ('Energético',            'estimulante', 'Bebida com cafeína e taurina.'),
  ('Café espresso',         'estimulante', 'Café concentrado, rico em cafeína.'),
  ('Cold brew',             'estimulante', 'Café extraído a frio.'),
  ('Chá mate',              'estimulante', 'Infusão de erva-mate, contém cafeína.'),
  ('Guaraná em pó',         'estimulante', 'Pó de guaraná, alto teor de cafeína.'),
  ('Morango',               'fruta',       'Morangos frescos.'),
  ('Maracujá (polpa)',      'fruta',       'Polpa de maracujá com sementes.'),
  ('Abacaxi',               'fruta',       'Abacaxi fresco em pedaços.'),
  ('Laranja',               'fruta',       'Laranja fresca.'),
  ('Melancia',              'fruta',       'Melancia em cubos.'),
  ('Frutas vermelhas',      'fruta',       'Mix de amora, framboesa e mirtilo.'),
  ('Kiwi',                  'fruta',       'Kiwi maduro.'),
  ('Suco de laranja',       'suco',        'Suco natural de laranja.'),
  ('Suco de abacaxi',       'suco',        'Suco de abacaxi.'),
  ('Suco de cranberry',     'suco',        'Suco de cranberry.'),
  ('Suco de maçã',          'suco',        'Suco de maçã.'),
  ('Suco de tomate',        'suco',        'Suco de tomate temperado ou natural.'),
  ('Água tônica',           'refrigerante','Refrigerante levemente amargo (quinino).'),
  ('Ginger ale',            'refrigerante','Refrigerante de gengibre.'),
  ('Refrigerante de limão', 'refrigerante','Refrigerante sabor limão.'),
  ('Cola',                  'refrigerante','Refrigerante de cola.'),
  ('Xarope simples',        'xarope',      'Açúcar e água em partes iguais.'),
  ('Xarope de groselha',    'xarope',      'Xarope vermelho adocicado.'),
  ('Mel',                   'xarope',      'Mel de abelha.'),
  ('Xarope de agave',       'xarope',      'Adoçante de agave.'),
  ('Xarope de gengibre',    'xarope',      'Xarope picante de gengibre.'),
  ('Água com gás',          'agua',        'Água gaseificada.'),
  ('Água',                  'agua',        'Água filtrada.'),
  ('Gelo',                  'agua',        'Cubos de gelo.'),
  ('Hortelã',               'outro',       'Folhas frescas de hortelã.'),
  ('Manjericão',            'outro',       'Folhas frescas de manjericão.'),
  ('Gengibre',              'outro',       'Raiz de gengibre fresca.'),
  ('Açúcar',                'outro',       'Açúcar refinado ou demerara.'),
  ('Sal',                   'outro',       'Sal para crusta ou tempero.'),
  ('Canela',                'outro',       'Canela em pau ou em pó.'),
  ('Leite de coco',         'outro',       'Bebida vegetal de coco (não é laticínio).')
on conflict (nome) do nothing;

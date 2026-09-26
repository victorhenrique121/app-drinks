-- =============================================================================
-- COPO CERTO — Testes de segurança (RLS, Storage e regras de compatibilidade)
--
-- Como usar:
--   1. Crie dois usuários pelo app (ou em Authentication → Users): A e B.
--   2. Substitua os UUIDs abaixo pelos ids reais.
--   3. Execute bloco a bloco no SQL Editor. Cada bloco roda em uma transação
--      que termina com ROLLBACK, então nada fica gravado.
--
-- "set local role authenticated" + request.jwt.claims simulam exatamente
-- uma requisição autenticada vinda do navegador (auth.uid() = sub).
-- =============================================================================

-- >>> SUBSTITUA <<<
-- Usuário A: 00000000-0000-0000-0000-00000000000a
-- Usuário B: 00000000-0000-0000-0000-00000000000b

-- ---------------------------------------------------------------------------
-- T1. Usuário B cria um drink válido (deve FUNCIONAR)
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

  select public.create_drink(
    'Drink do B', null, 'Misture tudo com gelo e sirva.', 'drink', true, false,
    jsonb_build_array(
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Gin'), 'quantidade', 50, 'unidade', 'ml'),
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Água tônica'), 'quantidade', 150, 'unidade', 'ml')
    )
  );
  select id, autor_id, nome from drinks where nome = 'Drink do B';
rollback;

-- ---------------------------------------------------------------------------
-- T2. Usuário A tenta EDITAR / EXCLUIR drink do B (deve afetar 0 linhas)
--     Crie antes um drink real com o usuário B pelo app e use o id dele.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

  update drinks set nome = 'Hackeado' where autor_id = '00000000-0000-0000-0000-00000000000b';  -- UPDATE 0
  delete from drinks where autor_id = '00000000-0000-0000-0000-00000000000b';                  -- DELETE 0
  delete from drink_ingredients
   where drink_id in (select id from drinks where autor_id = '00000000-0000-0000-0000-00000000000b'); -- DELETE 0

  -- Via RPC: deve lançar CC_SEM_PERMISSAO
  -- select public.update_drink('<id-do-drink-de-B>', 'X', null, 'Preparo qualquer aqui', 'drink', true, false,
  --   '[{"ingredient_id":1,"quantidade":50,"unidade":"ml"}]'::jsonb);
rollback;

-- ---------------------------------------------------------------------------
-- T3. Usuário A tenta criar drink com autor_id = B (trigger força autor = A)
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  -- O trigger drinks_before_write SUBSTITUI autor_id por auth.uid() (A).
  -- Em um COMMIT real, falharia com CC_SEM_INGREDIENTES (validação adiada).
  insert into drinks (autor_id, nome, modo_preparo, tipo)
  values ('00000000-0000-0000-0000-00000000000b', 'Falso', 'Preparo qualquer aqui', 'drink')
  returning id, autor_id;   -- autor_id retornado = A, nunca B
  set constraints all immediate;  -- dispara a validação agora -> ERRO CC_SEM_INGREDIENTES
rollback;

-- ---------------------------------------------------------------------------
-- T4. Usuário A tenta ver / apagar favoritos do B (deve retornar 0 linhas)
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select * from saved_drinks where user_id = '00000000-0000-0000-0000-00000000000b';  -- 0 linhas
  delete from saved_drinks where user_id = '00000000-0000-0000-0000-00000000000b';    -- DELETE 0
  -- Inserir favorito em nome do B: viola RLS (erro 42501)
  -- insert into saved_drinks (user_id, drink_id) values ('00000000-0000-0000-0000-00000000000b', '<id-drink>');
rollback;

-- ---------------------------------------------------------------------------
-- T5. Usuário A tenta ler o perfil do B diretamente (0 linhas)
--     mas consegue ver apenas nome/avatar pela view public_profiles.
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select * from profiles where id = '00000000-0000-0000-0000-00000000000b';          -- 0 linhas
  update profiles set nome = 'X' where id = '00000000-0000-0000-0000-00000000000b';   -- UPDATE 0
  select * from public_profiles where id = '00000000-0000-0000-0000-00000000000b';   -- id, nome, avatar_url
rollback;

-- ---------------------------------------------------------------------------
-- T6. Usuário A tenta apagar a imagem do B no Storage (0 objetos)
-- ---------------------------------------------------------------------------
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  delete from storage.objects
   where bucket_id = 'drink-images'
     and name like '00000000-0000-0000-0000-00000000000b/%';   -- DELETE 0
rollback;

-- ---------------------------------------------------------------------------
-- T7. Compatibilidade (todas como usuário A)
-- ---------------------------------------------------------------------------
-- 7a. Laticínio + ácido DENTRO da proporção (80 ml leite condensado, 30 ml limão = 37,5%) -> OK
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select public.create_drink('Batida ok', null, 'Bata tudo no liquidificador.', 'mocktail', true, false,
    jsonb_build_array(
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Leite condensado'), 'quantidade', 80, 'unidade', 'ml'),
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Suco de limão'), 'quantidade', 30, 'unidade', 'ml')));
rollback;

-- 7b. Laticínio + ácido ACIMA da proporção (40 ml / 30 ml = 75%) -> ERRO CC_ACIDO_LATICINIO
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select public.create_drink('Batida ruim', null, 'Bata tudo no liquidificador.', 'mocktail', true, false,
    jsonb_build_array(
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Leite condensado'), 'quantidade', 40, 'unidade', 'ml'),
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Suco de limão'), 'quantidade', 30, 'unidade', 'ml')));
rollback;

-- 7c. Álcool + estimulante SEM confirmação -> ERRO CC_CONFIRMACAO_ESTIMULANTE
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select public.create_drink('Vodka energy', null, 'Misture com gelo e sirva.', 'drink', true, false,
    jsonb_build_array(
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Vodka'), 'quantidade', 50, 'unidade', 'ml'),
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Energético'), 'quantidade', 150, 'unidade', 'ml')));
rollback;

-- 7d. Álcool + estimulante COM confirmação -> OK
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select public.create_drink('Vodka energy', null, 'Misture com gelo e sirva.', 'drink', true, true,
    jsonb_build_array(
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Vodka'), 'quantidade', 50, 'unidade', 'ml'),
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Energético'), 'quantidade', 150, 'unidade', 'ml')));
rollback;

-- 7e. Estimulante sem álcool (mocktail com café) -> OK sem confirmação
-- 7f. Mocktail com álcool -> ERRO CC_MOCKTAIL_COM_ALCOOL
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
  select public.create_drink('Falso mocktail', null, 'Misture com gelo e sirva.', 'mocktail', true, false,
    jsonb_build_array(
      jsonb_build_object('ingredient_id', (select id from ingredients where nome = 'Gin'), 'quantidade', 50, 'unidade', 'ml')));
rollback;

-- 7g. Burlar a regra inserindo ingrediente direto (sem RPC) em um drink próprio válido:
--     adicionar 200 ml de limão a uma receita com 40 ml de leite -> ERRO no COMMIT (trigger adiado).

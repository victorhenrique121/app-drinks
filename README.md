# 🍸 Copo Certo

Plataforma de receitas de **drinks e mocktails**: crie, pesquise, filtre e favorite receitas, com
**alertas de segurança** baseados nas categorias dos ingredientes (ácido forte + laticínio, álcool + estimulante).

Stack: **React 19 + TypeScript + Vite + Tailwind CSS v4** no frontend e **Supabase** (Auth, PostgreSQL, RLS e Storage) como backend.
Não há backend próprio.

---

## Arquitetura

```text
React (pages / components)
  ↓  hooks (useAuth, useFavorites, useToast)
Services (src/services/*)  ← único lugar que fala com o Supabase
  ↓  @supabase/supabase-js (chave anon)
Supabase
  ├── Auth ........ e-mail/senha, Google OAuth (PKCE), recuperação de senha
  ├── PostgreSQL .. tabelas, CHECKs, triggers, RPCs transacionais
  ├── RLS ......... quem lê/escreve cada linha
  └── Storage ..... drink-images/{user_id}/{drink_id}.jpg + policies
```

**Segurança em camadas.** O frontend faz validação de UX (mensagens, bloqueio de botão, modal de confirmação).
A autorização e as regras críticas são garantidas no banco:

| Regra | Onde é garantida |
|---|---|
| Só o autor edita/exclui o drink | RLS `drinks_update_own` / `drinks_delete_own` + RPC `update_drink` |
| `autor_id` nunca vem do cliente | trigger `drinks_before_write` (força `auth.uid()`) |
| Favoritos privados | RLS em `saved_drinks` + `user_id default auth.uid()` |
| Sem favorito duplicado | `unique (user_id, drink_id)` |
| Sem ingrediente duplicado | `unique (drink_id, ingredient_id)` |
| Ácido forte + laticínio acima de 50% | `validate_drink_composition()` via **constraint trigger adiado** |
| Álcool + estimulante exige confirmação | mesma função (`aviso_estimulante_confirmado`) |
| Mocktail sem álcool | mesma função |
| Criação/edição atômica | RPCs `create_drink` / `update_drink` (uma transação) |
| Imagens só na própria pasta | Storage policies + regex da URL em `drinks_before_write` |
| Perfil visível só ao dono | RLS em `profiles`; nome público via view `public_profiles` |

Mesmo que alguém altere o JavaScript no DevTools ou chame a API diretamente, o PostgreSQL recusa a operação.

### Fluxo de criação de um drink

1. Imagem validada (magic bytes, até 5 MB) e re-codificada em JPEG **antes** de tocar no banco.
2. `rpc('create_drink')` grava `drinks` + `drink_ingredients` em **uma transação**; as regras de compatibilidade rodam no Postgres.
3. Upload para `drink-images/{user_id}/{drink_id}.jpg`.
4. `update drinks set url_imagem`.
5. Se 3 ou 4 falharem, o arquivo é removido e o drink é excluído (rollback compensatório); o usuário vê uma mensagem amigável e pode tentar de novo.

---

## Estrutura

```text
supabase/
├── schema.sql            # tabelas, triggers, RPCs, RLS, Storage, seed de ingredientes
└── security-tests.sql    # testes de RLS/Storage/compatibilidade simulando usuários A e B
src/
├── components/
│   ├── ui/               # Button, Field, Modal (acessível), Feedback, Toast, Icons
│   ├── drinks/           # DrinkCard, DrinkGrid, DrinkForm, CompatibilityPanel, StimulantConfirmModal, ImagePicker, FavoritesProvider
│   ├── ingredients/      # IngredientSelector (combobox ARIA + linhas editáveis)
│   └── layout/           # Layout, Header, Logo, AuthProvider, AuthShell, PrivateRoute
├── pages/                # Home, Login, Register, AuthCallback, ResetPassword, Drinks, DrinkDetails,
│                         # CreateDrink, EditDrink, Favorites, Profile, NotFound
├── hooks/                # useAuth, useFavorites, useToast, useDocumentTitle
├── services/             # auth, drinks, ingredients, favorites, profiles, storage, mappers, demo/
├── lib/supabase.ts       # cliente Supabase (somente chave anon)
├── utils/                # compatibility, validation, errors, image, constants, cn
├── types/database.ts     # tipos das tabelas e do domínio
├── App.tsx               # rotas + providers
└── main.tsx
```

---

## Instalação e execução

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # http://localhost:5173
npm run build                # build de produção em dist/
```

### Variáveis de ambiente

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

> ⚠️ Nunca use a chave `service_role` no frontend. Tudo que começa com `VITE_` vai para o navegador.

**Modo demonstração:** sem essas variáveis, o app roda com dados locais (localStorage), login simulado
(nenhuma senha é armazenada) e um banner de aviso. Ele serve apenas para avaliar a interface; as mesmas
regras de negócio são reproduzidas localmente, mas a segurança real é a do Supabase.

---

## Configurar o Supabase

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor →** cole e execute todo o conteúdo de `supabase/schema.sql`. Ele cria:
   - as tabelas `profiles`, `ingredients`, `drinks`, `drink_ingredients` e `saved_drinks`;
   - o trigger que cria o perfil ao cadastrar (e-mail ou Google);
   - os triggers de autoria e de compatibilidade;
   - as RPCs `create_drink` / `update_drink`;
   - as views `public_profiles` / `drink_popularity`;
   - todas as políticas RLS;
   - o bucket `drink-images` (público para leitura, JPEG, 5 MB) e suas policies;
   - o seed de cerca de 66 ingredientes categorizados.
3. **Project Settings → API:** copie a *Project URL* e a *anon public key* para o `.env.local`.
4. **Authentication → URL Configuration:**
   - *Site URL*: `http://localhost:5173` (e depois o domínio de produção).
   - *Redirect URLs*: `http://localhost:5173/auth/callback`, `http://localhost:5173/redefinir-senha`
     e os equivalentes do domínio de produção.
5. (Opcional) **Authentication → Providers → Email:** mantenha "Confirm email" ativo em produção.

### Configurar o Google OAuth

1. No [Google Cloud Console](https://console.cloud.google.com/): *APIs & Services → Credentials → Create credentials → OAuth client ID* (tipo **Web application**).
2. Em *Authorized JavaScript origins* adicione `http://localhost:5173` e o domínio de produção.
3. Em *Authorized redirect URIs* adicione a URL de callback **do Supabase**:
   `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
4. Configure a tela de consentimento OAuth (nome "Copo Certo", e-mail de suporte).
5. No Supabase: *Authentication → Providers → Google*: ative e cole o **Client ID** e o **Client Secret**.
6. Fluxo resultante: `Google → Supabase Auth → /auth/callback → sessão obtida do Supabase (getSession + getUser) → Home`.

### Deploy

O app usa `BrowserRouter`, então configure o fallback de SPA para `index.html`:
`vercel.json` (Vercel) e `public/_redirects` (Netlify) já estão incluídos.

---

## Regras de compatibilidade

Implementadas em `src/utils/compatibility.ts` (UX) **e** em `public.validate_drink_composition()` (garantia).
As categorias sempre vêm da tabela `ingredients`, nunca do texto digitado.

| Situação | Resultado |
|---|---|
| Ácido forte + laticínio, ácido ≤ 50% do volume de laticínio | Permitido |
| Ácido forte + laticínio, ácido > 50% | **Bloqueado** |
| Ácido/laticínio com unidade não mensurável (a gosto, folha) | **Bloqueado** (proporção impossível de verificar) |
| Álcool (`alcool`, `destilado`, `licor`) + `estimulante` | Modal com checkbox "Entendo o aviso e quero continuar" |
| Mocktail com ingrediente alcoólico | **Bloqueado** |

A conversão para ml (`UNIT_TO_ML` / `public.to_ml`) é aproximada: 1 oz = 30 ml, 1 colher de sopa = 15 ml, 1 unidade ≈ 30 ml etc.

---

## Checklist de testes

### Auth
- [ ] Cadastro com e-mail (validações: nome, e-mail, senha ≥ 8 com letras e números, confirmação)
- [ ] Perfil criado automaticamente em `profiles`
- [ ] Login com e-mail/senha; senha errada mostra "E-mail ou senha incorretos."
- [ ] E-mail inválido mostra mensagem no campo
- [ ] Continuar com Google → volta para `/auth/callback` → Home autenticada
- [ ] Esqueci minha senha → e-mail → `/redefinir-senha` → nova senha
- [ ] Sessão persiste ao recarregar a página
- [ ] Sessão expirada/revogada → aviso "Sua sessão expirou" e rotas privadas redirecionam ao login
- [ ] Logout

### Drinks
- [ ] Criar drink e mocktail (com e sem imagem)
- [ ] Upload: rejeita arquivo não-imagem renomeado para .jpg, e imagens > 5 MB
- [ ] Editar dados, ingredientes e imagem (trocar/remover)
- [ ] Excluir (modal de confirmação), imagem removida do Storage
- [ ] Pesquisar por nome/ingrediente, filtros (Todos, Drinks, Mocktails, Com álcool, Sem álcool), ordenação
- [ ] Detalhes: autor vê Editar/Excluir; outros usuários não

### Ingredientes
- [ ] Buscar, adicionar pelo teclado (↑ ↓ Enter Esc) e pelo mouse
- [ ] Remover, reordenar, alterar quantidade e unidade
- [ ] Ingrediente duplicado é impedido (UI e `unique` no banco)
- [ ] Busca sem resultado mostra "Nenhum ingrediente encontrado."

### Compatibilidade (`supabase/security-tests.sql`, bloco T7)
- [ ] Laticínio + ácido dentro da proporção → salva
- [ ] Laticínio + ácido acima da proporção → bloqueado (UI e banco)
- [ ] Álcool + estimulante → modal; sem confirmar o banco recusa
- [ ] Álcool sem estimulante → salva sem aviso
- [ ] Estimulante sem álcool → salva sem aviso
- [ ] Receita sem ingredientes problemáticos → salva

### Segurança (`supabase/security-tests.sql`, blocos T2–T6)
- [ ] Usuário A tentando editar drink do Usuário B → 0 linhas / `CC_SEM_PERMISSAO`
- [ ] Usuário A tentando excluir drink do Usuário B → 0 linhas
- [ ] Usuário A tentando excluir imagem do Usuário B → 0 objetos
- [ ] Usuário A tentando acessar favoritos do Usuário B → 0 linhas
- [ ] Usuário A lendo `profiles` do B → 0 linhas (apenas nome/avatar pela view)

### Acessibilidade e responsividade
- [ ] Navegação completa por teclado, foco visível, link "Pular para o conteúdo"
- [ ] Modais prendem o foco, fecham com Esc e devolvem o foco
- [ ] Erros associados aos campos (`aria-describedby`, `aria-invalid`)
- [ ] Estados comunicados com ícone + texto (não só cor)
- [ ] Layout em celular, tablet e desktop

---

## Próximos passos sugeridos

- Paginação/pesquisa full-text no servidor (hoje: últimos 200 drinks filtrados no cliente).
- Geração de tipos com `supabase gen types typescript` para tipar o cliente.
- Painel administrativo (via Edge Function com service role no servidor) para gerenciar ingredientes.

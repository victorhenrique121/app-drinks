/**
 * MODO DEMONSTRAÇÃO — usado apenas quando VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * não estão configuradas. Os dados ficam no localStorage deste navegador.
 *
 * - Não há autenticação real e NENHUMA senha é armazenada.
 * - As mesmas regras de negócio do banco (autoria, composição, favoritos
 *   por usuário) são reproduzidas aqui para a experiência ser fiel.
 * - Em produção, a segurança é garantida pelo Supabase (RLS/Storage/Postgres).
 */
import type {
  AuthSession,
  AuthUser,
  Drink,
  DrinkInput,
  Ingredient,
  Unit,
} from '@/types/database';
import { checkCompatibility } from '@/utils/compatibility';
import { isAlcoholicCategory } from '@/utils/constants';
import { DEMO_TEAM_AUTHOR, SEED_DRINKS, SEED_INGREDIENTS } from './seed';

const STORAGE_KEY = 'copo-certo-demo-v1';

interface StoredUser {
  id: string;
  email: string | null;
  nome: string;
}

interface StoredDrink {
  id: string;
  autor_id: string;
  nome: string;
  descricao: string | null;
  modo_preparo: string;
  url_imagem: string | null;
  tipo: 'drink' | 'mocktail';
  publico: boolean;
  aviso_estimulante_confirmado: boolean;
  created_at: string;
  updated_at: string;
  ingredientes: { ingredient_id: number; quantidade: number | null; unidade: Unit }[];
}

interface StoredFavorite {
  user_id: string;
  drink_id: string;
  created_at: string;
}

interface DemoState {
  users: StoredUser[];
  drinks: StoredDrink[];
  favorites: StoredFavorite[];
  sessionUserId: string | null;
}

const INGREDIENTS: Ingredient[] = SEED_INGREDIENTS.map(([nome, categoria, descricao], index) => ({
  id: index + 1,
  nome,
  categoria,
  descricao,
}));
const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function seedState(): DemoState {
  const byName = new Map(INGREDIENTS.map((i) => [i.nome, i.id]));
  const now = Date.now();
  const drinks: StoredDrink[] = [];
  const favorites: StoredFavorite[] = [];

  SEED_DRINKS.forEach((seed) => {
    const created = new Date(now - seed.diasAtras * 86_400_000).toISOString();
    const id = uuid();
    drinks.push({
      id,
      autor_id: DEMO_TEAM_AUTHOR.id,
      nome: seed.nome,
      descricao: seed.descricao,
      modo_preparo: seed.preparo,
      url_imagem: seed.imagem,
      tipo: seed.tipo,
      publico: true,
      aviso_estimulante_confirmado: false,
      created_at: created,
      updated_at: created,
      ingredientes: seed.ingredientes.map(([nome, quantidade, unidade]) => ({
        ingredient_id: byName.get(nome) ?? 1,
        quantidade,
        unidade,
      })),
    });
    for (let i = 0; i < seed.favoritos; i++) {
      favorites.push({ user_id: `seed-user-${i}`, drink_id: id, created_at: created });
    }
  });

  return { users: [DEMO_TEAM_AUTHOR], drinks, favorites, sessionUserId: null };
}

let cache: DemoState | null = null;

function load(): DemoState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as DemoState) : seedState();
  } catch {
    cache = seedState();
  }
  if (!localStorage.getItem(STORAGE_KEY)) persist(cache);
  return cache;
}

function persist(state: DemoState): void {
  // Pode lançar QuotaExceededError — tratado pelos serviços.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  cache = state;
}

function mutate(fn: (draft: DemoState) => void): void {
  const current = load();
  const draft: DemoState = JSON.parse(JSON.stringify(current));
  fn(draft);
  persist(draft);
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------- Auth ---------------------------------- */

type AuthListener = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED', session: AuthSession | null) => void;
const listeners = new Set<AuthListener>();

function toAuthUser(user: StoredUser): AuthUser {
  return { id: user.id, email: user.email, nome: user.nome, avatar_url: null };
}

function currentSession(): AuthSession | null {
  const state = load();
  const user = state.users.find((u) => u.id === state.sessionUserId);
  return user ? { user: toAuthUser(user), expires_at: null } : null;
}

function emit(event: Parameters<AuthListener>[0]) {
  const session = currentSession();
  listeners.forEach((l) => l(event, session));
}

function requireUserId(): string {
  const session = currentSession();
  if (!session) throw new Error('CC_NAO_AUTENTICADO');
  return session.user.id;
}

export const demoAuth = {
  async getSession(): Promise<AuthSession | null> {
    return currentSession();
  },
  onChange(listener: AuthListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async signIn(email: string): Promise<AuthSession> {
    await delay();
    const normalized = email.trim().toLowerCase();
    mutate((s) => {
      let user = s.users.find((u) => u.email === normalized);
      if (!user) {
        user = { id: uuid(), email: normalized, nome: normalized.split('@')[0] || 'Usuário' };
        s.users.push(user);
      }
      s.sessionUserId = user.id;
    });
    emit('SIGNED_IN');
    return currentSession() as AuthSession;
  },
  async signUp(nome: string, email: string): Promise<AuthSession> {
    await delay();
    const normalized = email.trim().toLowerCase();
    const state = load();
    if (state.users.some((u) => u.email === normalized)) {
      throw new Error('User already registered');
    }
    mutate((s) => {
      const user = { id: uuid(), email: normalized, nome: nome.trim() };
      s.users.push(user);
      s.sessionUserId = user.id;
    });
    emit('SIGNED_IN');
    return currentSession() as AuthSession;
  },
  async signOut(): Promise<void> {
    await delay(100);
    mutate((s) => {
      s.sessionUserId = null;
    });
    emit('SIGNED_OUT');
  },
  async updateName(nome: string): Promise<void> {
    await delay();
    const uid = requireUserId();
    mutate((s) => {
      const u = s.users.find((x) => x.id === uid);
      if (u) u.nome = nome.trim();
    });
    emit('USER_UPDATED');
  },
};

/* ---------------------------------- Dados --------------------------------- */

function hydrate(drink: StoredDrink, state: DemoState): Drink {
  const author = state.users.find((u) => u.id === drink.autor_id);
  const ingredientes = drink.ingredientes
    .map((item, index) => {
      const ing = INGREDIENT_BY_ID.get(item.ingredient_id);
      if (!ing) return null;
      return {
        id: ing.id,
        vinculo_id: index + 1,
        nome: ing.nome,
        categoria: ing.categoria,
        quantidade: item.quantidade,
        unidade: item.unidade,
        ordem: index,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    id: drink.id,
    autor_id: drink.autor_id,
    nome: drink.nome,
    descricao: drink.descricao,
    modo_preparo: drink.modo_preparo,
    url_imagem: drink.url_imagem,
    tipo: drink.tipo,
    publico: drink.publico,
    created_at: drink.created_at,
    updated_at: drink.updated_at,
    ingredientes,
    autor: author ? { id: author.id, nome: author.nome, avatar_url: null } : null,
    contemAlcool: ingredientes.some((i) => isAlcoholicCategory(i.categoria)),
  };
}

/** Equivalente a validate_drink_composition() do Postgres. */
function validateComposition(input: DrinkInput): void {
  if (input.ingredientes.length === 0) throw new Error('CC_SEM_INGREDIENTES');
  if (input.ingredientes.length > 30) throw new Error('CC_MUITOS_INGREDIENTES');
  const ids = input.ingredientes.map((i) => i.ingredient_id);
  if (new Set(ids).size !== ids.length) {
    throw Object.assign(new Error('duplicate key drink_ingredients_sem_duplicados'), { code: '23505' });
  }
  const items = input.ingredientes.map((i) => {
    const ing = INGREDIENT_BY_ID.get(i.ingredient_id);
    if (!ing) throw Object.assign(new Error('invalid ingredient'), { code: '23514' });
    return { nome: ing.nome, categoria: ing.categoria, quantidade: i.quantidade, unidade: i.unidade };
  });
  const result = checkCompatibility(items, input.tipo);
  const block = result.issues.find((i) => i.level === 'block');
  if (block?.id === 'mocktail_alcool') throw new Error('CC_MOCKTAIL_COM_ALCOOL');
  if (block?.id === 'nao_mensuravel') throw new Error('CC_QUANTIDADE_NAO_MENSURAVEL');
  if (block?.id === 'acido_laticinio') throw new Error('CC_ACIDO_LATICINIO');
  if (result.requiresConfirmation && !input.confirmouAviso) throw new Error('CC_CONFIRMACAO_ESTIMULANTE');
}

function isVisible(drink: StoredDrink, uid: string | null): boolean {
  return drink.publico || drink.autor_id === uid;
}

export const demoDb = {
  async listIngredients(): Promise<Ingredient[]> {
    await delay(120);
    return [...INGREDIENTS].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  },

  async listDrinks(options: { autorId?: string } = {}): Promise<Drink[]> {
    await delay();
    const state = load();
    const uid = state.sessionUserId;
    return state.drinks
      .filter((d) => isVisible(d, uid))
      .filter((d) => (options.autorId ? d.autor_id === options.autorId : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((d) => hydrate(d, state));
  },

  async popularity(): Promise<Record<string, number>> {
    const state = load();
    const counts: Record<string, number> = {};
    state.favorites.forEach((f) => {
      counts[f.drink_id] = (counts[f.drink_id] ?? 0) + 1;
    });
    return counts;
  },

  async getDrink(id: string): Promise<Drink | null> {
    await delay(180);
    const state = load();
    const drink = state.drinks.find((d) => d.id === id);
    if (!drink || !isVisible(drink, state.sessionUserId)) return null;
    return hydrate(drink, state);
  },

  async createDrink(input: DrinkInput): Promise<string> {
    await delay(350);
    const uid = requireUserId();
    validateComposition(input);
    const id = uuid();
    const now = new Date().toISOString();
    mutate((s) => {
      s.drinks.push({
        id,
        autor_id: uid, // autor sempre é o usuário da sessão
        nome: input.nome.trim(),
        descricao: input.descricao.trim() || null,
        modo_preparo: input.modo_preparo.trim(),
        url_imagem: null,
        tipo: input.tipo,
        publico: input.publico,
        aviso_estimulante_confirmado: input.confirmouAviso,
        created_at: now,
        updated_at: now,
        ingredientes: input.ingredientes,
      });
    });
    return id;
  },

  async updateDrink(id: string, input: DrinkInput): Promise<void> {
    await delay(350);
    const uid = requireUserId();
    const drink = load().drinks.find((d) => d.id === id);
    if (!drink || drink.autor_id !== uid) throw new Error('CC_SEM_PERMISSAO');
    validateComposition(input);
    mutate((s) => {
      const d = s.drinks.find((x) => x.id === id);
      if (!d) return;
      d.nome = input.nome.trim();
      d.descricao = input.descricao.trim() || null;
      d.modo_preparo = input.modo_preparo.trim();
      d.tipo = input.tipo;
      d.publico = input.publico;
      d.aviso_estimulante_confirmado = input.confirmouAviso;
      d.ingredientes = input.ingredientes;
      d.updated_at = new Date().toISOString();
    });
  },

  async setImage(id: string, url: string | null): Promise<void> {
    await delay(200);
    const uid = requireUserId();
    const drink = load().drinks.find((d) => d.id === id);
    if (!drink || drink.autor_id !== uid) throw new Error('CC_SEM_PERMISSAO');
    mutate((s) => {
      const d = s.drinks.find((x) => x.id === id);
      if (d) d.url_imagem = url;
    });
  },

  async deleteDrink(id: string): Promise<void> {
    await delay(300);
    const uid = requireUserId();
    const drink = load().drinks.find((d) => d.id === id);
    if (!drink || drink.autor_id !== uid) throw new Error('CC_SEM_PERMISSAO');
    mutate((s) => {
      s.drinks = s.drinks.filter((d) => d.id !== id);
      s.favorites = s.favorites.filter((f) => f.drink_id !== id);
    });
  },

  async favoriteIds(): Promise<string[]> {
    await delay(120);
    const uid = requireUserId();
    return load()
      .favorites.filter((f) => f.user_id === uid)
      .map((f) => f.drink_id);
  },

  async savedDrinks(): Promise<Drink[]> {
    await delay();
    const uid = requireUserId();
    const state = load();
    return state.favorites
      .filter((f) => f.user_id === uid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((f) => state.drinks.find((d) => d.id === f.drink_id))
      .filter((d): d is StoredDrink => Boolean(d) && isVisible(d as StoredDrink, uid))
      .map((d) => hydrate(d, state));
  },

  async addFavorite(drinkId: string): Promise<void> {
    await delay(150);
    const uid = requireUserId();
    const state = load();
    const drink = state.drinks.find((d) => d.id === drinkId);
    if (!drink || !isVisible(drink, uid)) throw Object.assign(new Error('permission denied'), { code: '42501' });
    if (state.favorites.some((f) => f.user_id === uid && f.drink_id === drinkId)) {
      throw Object.assign(new Error('saved_drinks_user_drink_unique'), { code: '23505' });
    }
    mutate((s) => {
      s.favorites.push({ user_id: uid, drink_id: drinkId, created_at: new Date().toISOString() });
    });
  },

  async removeFavorite(drinkId: string): Promise<void> {
    await delay(150);
    const uid = requireUserId();
    mutate((s) => {
      s.favorites = s.favorites.filter((f) => !(f.user_id === uid && f.drink_id === drinkId));
    });
  },
};

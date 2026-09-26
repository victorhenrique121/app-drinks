/* =============================================================================
 * Tipos do banco (espelham supabase/schema.sql) e tipos de domínio da aplicação.
 * ========================================================================== */

export const INGREDIENT_CATEGORIES = [
  'alcool',
  'destilado',
  'licor',
  'laticinio',
  'acido_forte',
  'estimulante',
  'fruta',
  'suco',
  'refrigerante',
  'xarope',
  'agua',
  'outro',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const DRINK_TYPES = ['drink', 'mocktail'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

export const UNITS = [
  'ml',
  'cl',
  'oz',
  'dash',
  'gota',
  'colher_cha',
  'colher_sopa',
  'unidade',
  'fatia',
  'folha',
  'g',
  'a_gosto',
] as const;
export type Unit = (typeof UNITS)[number];

/* ---------------------------- Linhas das tabelas ---------------------------- */

export interface ProfileRow {
  id: string;
  nome: string;
  avatar_url: string | null;
  created_at: string;
}

export interface IngredientRow {
  id: number;
  nome: string;
  categoria: IngredientCategory;
  descricao: string | null;
}

export interface DrinkRow {
  id: string;
  autor_id: string;
  nome: string;
  descricao: string | null;
  modo_preparo: string;
  url_imagem: string | null;
  tipo: DrinkType;
  publico: boolean;
  aviso_estimulante_confirmado: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrinkIngredientRow {
  id: number;
  drink_id: string;
  ingredient_id: number;
  quantidade: number | null;
  unidade: Unit;
  ordem: number;
}

export interface SavedDrinkRow {
  id: number;
  user_id: string;
  drink_id: string;
  created_at: string;
}

export interface PublicProfileRow {
  id: string;
  nome: string;
  avatar_url: string | null;
}

/* ------------------------------ Tipos de domínio ---------------------------- */

export type Ingredient = IngredientRow;

export interface RecipeIngredient {
  /** id do ingrediente (tabela ingredients) */
  id: number;
  /** id da linha em drink_ingredients */
  vinculo_id: number;
  nome: string;
  categoria: IngredientCategory;
  quantidade: number | null;
  unidade: Unit;
  ordem: number;
}

export interface DrinkAuthor {
  id: string;
  nome: string;
  avatar_url: string | null;
}

export interface Drink {
  id: string;
  autor_id: string;
  nome: string;
  descricao: string | null;
  modo_preparo: string;
  url_imagem: string | null;
  tipo: DrinkType;
  publico: boolean;
  created_at: string;
  updated_at: string;
  ingredientes: RecipeIngredient[];
  autor: DrinkAuthor | null;
  contemAlcool: boolean;
}

/** Linha de ingrediente enquanto o usuário edita o formulário. */
export interface IngredientDraft {
  key: string;
  ingredient: Ingredient;
  quantidade: string;
  unidade: Unit;
}

export interface DrinkInput {
  nome: string;
  descricao: string;
  modo_preparo: string;
  tipo: DrinkType;
  publico: boolean;
  confirmouAviso: boolean;
  ingredientes: {
    ingredient_id: number;
    quantidade: number | null;
    unidade: Unit;
  }[];
}

export type DrinkFilter = 'todos' | 'drink' | 'mocktail' | 'com_alcool' | 'sem_alcool';
export type DrinkSort = 'recentes' | 'antigos' | 'nome' | 'menos_ingredientes';

export interface AuthUser {
  id: string;
  email: string | null;
  nome: string;
  avatar_url: string | null;
}

export interface AuthSession {
  user: AuthUser;
  expires_at: number | null;
}

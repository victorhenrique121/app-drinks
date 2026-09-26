import type { DrinkType, IngredientCategory, Unit } from '@/types/database';
import { NON_MEASURABLE_UNITS, UNIT_TO_ML, isAlcoholicCategory } from './constants';

/**
 * Regras de compatibilidade entre ingredientes.
 *
 * IMPORTANTE: esta verificação serve à EXPERIÊNCIA do usuário (mensagens,
 * bloqueio de botão, modal de confirmação). A mesma regra é validada de forma
 * confiável no PostgreSQL (public.validate_drink_composition) — o frontend
 * NÃO é mecanismo de segurança.
 *
 * As categorias vêm SEMPRE do cadastro em `ingredients`, nunca do texto
 * digitado pelo usuário.
 */

/** Volume máximo de ácido forte em relação ao volume de laticínio (50%). */
export const ACID_DAIRY_MAX_RATIO = 0.5;

export interface CompatibilityItem {
  nome: string;
  categoria: IngredientCategory;
  quantidade: number | null;
  unidade: Unit;
}

export type IssueLevel = 'block' | 'confirm';

export interface CompatibilityIssue {
  id: 'acido_laticinio' | 'nao_mensuravel' | 'mocktail_alcool' | 'estimulante_alcool';
  level: IssueLevel;
  title: string;
  message: string;
}

export interface CompatibilityResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  warnings: string[];
  issues: CompatibilityIssue[];
  stats: {
    acidMl: number;
    dairyMl: number;
    ratio: number | null;
    hasAlcohol: boolean;
    hasStimulant: boolean;
  };
}

export const ACID_DAIRY_MESSAGE =
  'Essa combinação pode causar incompatibilidade entre ingredientes ácidos e laticínios. Tente reduzir a quantidade do ingrediente ácido ou substituir um dos ingredientes.';

export const STIMULANT_ALCOHOL_MESSAGE =
  'Esta receita combina álcool com um ingrediente estimulante. Essa combinação pode aumentar riscos associados ao consumo, pois o estimulante pode alterar a percepção dos efeitos do álcool.';

export function toMl(quantidade: number | null, unidade: Unit): number {
  if (quantidade === null || !Number.isFinite(quantidade)) return 0;
  return quantidade * UNIT_TO_ML[unidade];
}

export function checkCompatibility(items: CompatibilityItem[], tipo?: DrinkType): CompatibilityResult {
  const issues: CompatibilityIssue[] = [];

  const acids = items.filter((i) => i.categoria === 'acido_forte');
  const dairies = items.filter((i) => i.categoria === 'laticinio');
  const alcohols = items.filter((i) => isAlcoholicCategory(i.categoria));
  const stimulants = items.filter((i) => i.categoria === 'estimulante');

  const acidMl = acids.reduce((sum, i) => sum + toMl(i.quantidade, i.unidade), 0);
  const dairyMl = dairies.reduce((sum, i) => sum + toMl(i.quantidade, i.unidade), 0);
  const ratio = dairyMl > 0 ? acidMl / dairyMl : null;

  // Regra 1: mocktail não pode ter álcool.
  if (tipo === 'mocktail' && alcohols.length > 0) {
    issues.push({
      id: 'mocktail_alcool',
      level: 'block',
      title: 'Mocktail com álcool',
      message: `Mocktails não podem conter ingredientes alcoólicos (${alcohols
        .map((a) => a.nome)
        .join(', ')}). Altere o tipo para "Drink" ou remova esses ingredientes.`,
    });
  }

  // Regra 2: ácido forte + laticínio -> verificar proporção.
  if (acids.length > 0 && dairies.length > 0) {
    const unmeasurable = [...acids, ...dairies].filter((i) => NON_MEASURABLE_UNITS.includes(i.unidade));
    if (unmeasurable.length > 0) {
      issues.push({
        id: 'nao_mensuravel',
        level: 'block',
        title: 'Quantidade necessária',
        message: `Para verificar a compatibilidade entre ácidos e laticínios, informe uma quantidade mensurável para: ${unmeasurable
          .map((i) => i.nome)
          .join(', ')}.`,
      });
    } else if (dairyMl === 0 || (ratio !== null && ratio > ACID_DAIRY_MAX_RATIO)) {
      issues.push({
        id: 'acido_laticinio',
        level: 'block',
        title: 'Ingredientes incompatíveis',
        message: ACID_DAIRY_MESSAGE,
      });
    }
  }

  // Regra 3: estimulante + álcool -> não bloqueia, exige confirmação explícita.
  if (alcohols.length > 0 && stimulants.length > 0) {
    issues.push({
      id: 'estimulante_alcool',
      level: 'confirm',
      title: 'Atenção: álcool + estimulante',
      message: STIMULANT_ALCOHOL_MESSAGE,
    });
  }

  const allowed = !issues.some((i) => i.level === 'block');
  const requiresConfirmation = issues.some((i) => i.level === 'confirm');

  return {
    allowed,
    requiresConfirmation,
    warnings: issues.map((i) => i.message),
    issues,
    stats: {
      acidMl,
      dairyMl,
      ratio,
      hasAlcohol: alcohols.length > 0,
      hasStimulant: stimulants.length > 0,
    },
  };
}

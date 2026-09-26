import { DRINK_TYPES, UNITS, type DrinkType, type IngredientDraft, type Unit } from '@/types/database';

/**
 * Validações de formulário (camada de UX).
 * O banco valida novamente via CHECK constraints, triggers e RLS.
 */

export const LIMITS = {
  nomeMin: 3,
  nomeMax: 80,
  descricaoMax: 500,
  preparoMin: 10,
  preparoMax: 4000,
  quantidadeMax: 5000,
  maxIngredientes: 30,
  senhaMin: 8,
  pessoaNomeMax: 80,
  imagemMaxBytes: 5 * 1024 * 1024,
} as const;

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Informe seu e-mail.';
  if (value.length > 254 || !EMAIL_REGEX.test(value)) return 'Informe um e-mail válido.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Informe sua senha.';
  if (password.length < LIMITS.senhaMin) return `A senha deve ter pelo menos ${LIMITS.senhaMin} caracteres.`;
  if (password.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.';
  return undefined;
}

export function validateLogin(values: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'Informe sua senha.';
  return errors;
}

export type RegisterField = 'nome' | 'email' | 'password' | 'confirmPassword';

export function validateRegister(values: Record<RegisterField, string>): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};
  const nome = values.nome.trim();
  if (!nome) errors.nome = 'Informe seu nome.';
  else if (nome.length < 2) errors.nome = 'O nome deve ter pelo menos 2 caracteres.';
  else if (nome.length > LIMITS.pessoaNomeMax) errors.nome = `O nome deve ter no máximo ${LIMITS.pessoaNomeMax} caracteres.`;

  const email = validateEmail(values.email);
  if (email) errors.email = email;

  const password = validatePassword(values.password);
  if (password) errors.password = password;

  if (!values.confirmPassword) errors.confirmPassword = 'Confirme sua senha.';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'As senhas não coincidem.';

  return errors;
}

export function validateNewPassword(password: string, confirm: string): FieldErrors<'password' | 'confirmPassword'> {
  const errors: FieldErrors<'password' | 'confirmPassword'> = {};
  const p = validatePassword(password);
  if (p) errors.password = p;
  if (!confirm) errors.confirmPassword = 'Confirme a nova senha.';
  else if (confirm !== password) errors.confirmPassword = 'As senhas não coincidem.';
  return errors;
}

/* --------------------------------- Drink ---------------------------------- */

export type DrinkField = 'nome' | 'descricao' | 'tipo' | 'modo_preparo' | 'ingredientes' | 'imagem';

export interface DrinkFormValues {
  nome: string;
  descricao: string;
  tipo: DrinkType | '';
  modo_preparo: string;
  ingredientes: IngredientDraft[];
}

export interface DrinkValidationResult {
  errors: FieldErrors<DrinkField>;
  /** erros por linha de ingrediente, indexados pela key do rascunho */
  ingredientErrors: Record<string, string>;
  valid: boolean;
}

export function parseQuantity(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export function isValidUnit(unit: string): unit is Unit {
  return (UNITS as readonly string[]).includes(unit);
}

export function validateDrinkForm(values: DrinkFormValues): DrinkValidationResult {
  const errors: FieldErrors<DrinkField> = {};
  const ingredientErrors: Record<string, string> = {};

  const nome = values.nome.trim();
  if (!nome) errors.nome = 'Informe o nome do drink.';
  else if (nome.length < LIMITS.nomeMin) errors.nome = `O nome deve ter pelo menos ${LIMITS.nomeMin} caracteres.`;
  else if (nome.length > LIMITS.nomeMax) errors.nome = `O nome deve ter no máximo ${LIMITS.nomeMax} caracteres.`;

  if (values.descricao.trim().length > LIMITS.descricaoMax) {
    errors.descricao = `A descrição deve ter no máximo ${LIMITS.descricaoMax} caracteres.`;
  }

  if (!values.tipo || !(DRINK_TYPES as readonly string[]).includes(values.tipo)) {
    errors.tipo = 'Escolha o tipo: Drink ou Mocktail.';
  }

  const preparo = values.modo_preparo.trim();
  if (!preparo) errors.modo_preparo = 'Descreva o modo de preparo.';
  else if (preparo.length < LIMITS.preparoMin) errors.modo_preparo = `Descreva o preparo com pelo menos ${LIMITS.preparoMin} caracteres.`;
  else if (preparo.length > LIMITS.preparoMax) errors.modo_preparo = `O modo de preparo deve ter no máximo ${LIMITS.preparoMax} caracteres.`;

  if (values.ingredientes.length === 0) {
    errors.ingredientes = 'Adicione pelo menos 1 ingrediente.';
  } else if (values.ingredientes.length > LIMITS.maxIngredientes) {
    errors.ingredientes = `A receita pode ter no máximo ${LIMITS.maxIngredientes} ingredientes.`;
  }

  const seen = new Set<number>();
  for (const draft of values.ingredientes) {
    if (seen.has(draft.ingredient.id)) {
      ingredientErrors[draft.key] = 'Ingrediente repetido. Remova o duplicado.';
      continue;
    }
    seen.add(draft.ingredient.id);

    if (!isValidUnit(draft.unidade)) {
      ingredientErrors[draft.key] = 'Escolha uma unidade válida.';
      continue;
    }
    if (draft.unidade === 'a_gosto') continue;

    const q = parseQuantity(draft.quantidade);
    if (q === null) ingredientErrors[draft.key] = 'Informe a quantidade.';
    else if (Number.isNaN(q) || q <= 0) ingredientErrors[draft.key] = 'A quantidade deve ser maior que zero.';
    else if (q > LIMITS.quantidadeMax) ingredientErrors[draft.key] = `Quantidade máxima: ${LIMITS.quantidadeMax}.`;
    else if (!/^\d+(\.\d{1,2})?$/.test(draft.quantidade.trim().replace(',', '.'))) {
      ingredientErrors[draft.key] = 'Use um número com no máximo 2 casas decimais.';
    }
  }

  if (!errors.ingredientes && Object.keys(ingredientErrors).length > 0) {
    errors.ingredientes = 'Revise os ingredientes destacados.';
  }

  return {
    errors,
    ingredientErrors,
    valid: Object.keys(errors).length === 0 && Object.keys(ingredientErrors).length === 0,
  };
}

/* --------------------------------- Imagem --------------------------------- */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp';

type DetectedType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Detecta o tipo REAL do arquivo pelos "magic bytes", não pela extensão. */
export async function detectImageType(file: Blob): Promise<DetectedType | null> {
  const buffer = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp';
  return null;
}

export async function validateImageFile(file: File): Promise<string | undefined> {
  if (file.size === 0) return 'O arquivo está vazio.';
  if (file.size > LIMITS.imagemMaxBytes) return 'A imagem deve ter no máximo 5 MB.';
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'Formato não suportado. Use JPG, PNG ou WEBP.';
  const realType = await detectImageType(file);
  if (!realType) return 'O arquivo não parece ser uma imagem JPG, PNG ou WEBP válida.';
  return undefined;
}

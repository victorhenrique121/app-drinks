/**
 * Tratamento centralizado de erros.
 * - O usuário vê apenas mensagens amigáveis (userMessage).
 * - Detalhes técnicos vão para o console somente em desenvolvimento.
 */
export class AppError extends Error {
  readonly userMessage: string;
  readonly code?: string;

  constructor(userMessage: string, options?: { code?: string; cause?: unknown }) {
    super(userMessage);
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.code = options?.code;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export function logDevError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[Copo Certo] ${context}:`, error);
  }
}

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

/** Mensagens de regras de negócio lançadas pelo banco (RAISE EXCEPTION 'CC_...'). */
const BUSINESS_MESSAGES: Record<string, string> = {
  CC_ACIDO_LATICINIO:
    'Essa combinação pode causar incompatibilidade entre ingredientes ácidos e laticínios. Tente reduzir a quantidade do ingrediente ácido ou substituir um dos ingredientes.',
  CC_CONFIRMACAO_ESTIMULANTE:
    'Esta receita combina álcool com um ingrediente estimulante. Confirme o aviso de segurança para continuar.',
  CC_MOCKTAIL_COM_ALCOOL: 'Mocktails não podem conter ingredientes alcoólicos. Altere o tipo para "Drink" ou remova o álcool.',
  CC_SEM_INGREDIENTES: 'Adicione pelo menos 1 ingrediente à receita.',
  CC_MUITOS_INGREDIENTES: 'A receita pode ter no máximo 30 ingredientes.',
  CC_QUANTIDADE_NAO_MENSURAVEL:
    'Informe uma quantidade mensurável (ml, colher, unidade...) para ingredientes ácidos e laticínios.',
  CC_IMAGEM_INVALIDA: 'A imagem enviada é inválida. Tente outra imagem.',
  CC_SEM_PERMISSAO: 'Você não tem permissão para alterar este drink.',
  CC_NAO_AUTENTICADO: 'Sua sessão expirou. Entre novamente para continuar.',
};

const AUTH_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
  [/user already registered|already been registered/i, 'Já existe uma conta com este e-mail.'],
  [/password should be at least/i, 'A senha é muito curta.'],
  [/new password should be different/i, 'A nova senha deve ser diferente da anterior.'],
  [/rate limit|too many requests/i, 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'Informe um e-mail válido.'],
  [/jwt expired|session.*(expired|missing)|refresh token/i, 'Sua sessão expirou. Entre novamente para continuar.'],
  [/provider is not enabled|unsupported provider/i, 'Login com Google indisponível no momento.'],
];

/** Converte qualquer erro em uma mensagem segura para exibir ao usuário. */
export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.userMessage;

  const err = (error ?? {}) as ErrorLike;
  const message = typeof err.message === 'string' ? err.message : '';

  for (const code of Object.keys(BUSINESS_MESSAGES)) {
    if (message.includes(code)) return BUSINESS_MESSAGES[code];
  }

  for (const [pattern, friendly] of AUTH_MESSAGES) {
    if (pattern.test(message)) return friendly;
  }

  if (err.code === '23505') {
    if (message.includes('drink_ingredients_sem_duplicados')) {
      return 'Há ingredientes repetidos na receita. Remova os duplicados.';
    }
    if (message.includes('saved_drinks_user_drink_unique')) {
      return 'Este drink já está nos seus favoritos.';
    }
    return 'Este registro já existe.';
  }
  if (err.code === '23514' || err.code === '22023' || err.code === '22P02') {
    return 'Alguns dados não são válidos. Revise o formulário e tente novamente.';
  }
  if (err.code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  if (err.code === 'PGRST116') {
    return 'Registro não encontrado.';
  }
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }
  if (/quota|exceeded the quota/i.test(message)) {
    return 'Espaço de armazenamento local esgotado. Remova alguns drinks ou use imagens menores.';
  }

  return fallback;
}

/** Registra detalhes (dev) e devolve um AppError amigável. */
export function toAppError(context: string, error: unknown, fallback: string): AppError {
  logDevError(context, error);
  if (error instanceof AppError) return error;
  const err = (error ?? {}) as ErrorLike;
  return new AppError(toUserMessage(error, fallback), { code: err.code, cause: error });
}

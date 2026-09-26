import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { ImageChange, SaveStage } from '@/services/drinks';
import { SAVE_STAGE_LABELS } from '@/services/drinks';
import type { Drink, DrinkInput, DrinkType, IngredientDraft } from '@/types/database';
import { cn } from '@/utils/cn';
import { checkCompatibility, type CompatibilityItem } from '@/utils/compatibility';
import { toUserMessage } from '@/utils/errors';
import { LIMITS, parseQuantity, validateDrinkForm, type DrinkField, type FieldErrors } from '@/utils/validation';
import { IngredientSelector } from '../ingredients/IngredientSelector';
import { Button, ButtonLink } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { TextAreaField, TextField } from '../ui/Field';
import { IconGlass, IconLeaf } from '../ui/Icons';
import { CompatibilityPanel } from './CompatibilityPanel';
import { ImagePicker } from './ImagePicker';
import { StimulantConfirmModal } from './StimulantConfirmModal';

interface DrinkFormProps {
  initial?: Drink;
  submitLabel: string;
  cancelTo: string;
  onSubmit: (input: DrinkInput, image: ImageChange, onStage: (stage: SaveStage) => void) => Promise<void>;
}

const FIELD_ORDER: { field: DrinkField; id: string }[] = [
  { field: 'nome', id: 'drink-nome' },
  { field: 'descricao', id: 'drink-descricao' },
  { field: 'tipo', id: 'drink-tipo-drink' },
  { field: 'imagem', id: 'drink-imagem' },
  { field: 'ingredientes', id: 'drink-ingredientes' },
  { field: 'modo_preparo', id: 'drink-preparo' },
];

function draftsFromDrink(drink?: Drink): IngredientDraft[] {
  if (!drink) return [];
  return drink.ingredientes.map((i) => ({
    key: `init-${i.vinculo_id}`,
    ingredient: { id: i.id, nome: i.nome, categoria: i.categoria, descricao: null },
    quantidade: i.quantidade === null ? '' : String(i.quantidade).replace('.', ','),
    unidade: i.unidade,
  }));
}

export function DrinkForm({ initial, submitLabel, cancelTo, onSubmit }: DrinkFormProps) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [tipo, setTipo] = useState<DrinkType | ''>(initial?.tipo ?? '');
  const [publico, setPublico] = useState(initial?.publico ?? true);
  const [preparo, setPreparo] = useState(initial?.modo_preparo ?? '');
  const [ingredientes, setIngredientes] = useState<IngredientDraft[]>(() => draftsFromDrink(initial));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState<string | undefined>();

  const [errors, setErrors] = useState<FieldErrors<DrinkField>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<SaveStage | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const compatItems = useMemo<CompatibilityItem[]>(
    () =>
      ingredientes.map((d) => {
        const q = d.unidade === 'a_gosto' ? null : parseQuantity(d.quantidade);
        return {
          nome: d.ingredient.nome,
          categoria: d.ingredient.categoria,
          quantidade: q === null || Number.isNaN(q) ? null : q,
          unidade: d.unidade,
        };
      }),
    [ingredientes],
  );
  const compat = useMemo(() => checkCompatibility(compatItems, tipo || undefined), [compatItems, tipo]);

  const values = { nome, descricao, tipo, modo_preparo: preparo, ingredientes };

  // Após a primeira tentativa, revalida enquanto o usuário corrige.
  const revalidate = (patch: Partial<typeof values>) => {
    if (!attempted) return;
    const result = validateDrinkForm({ ...values, ...patch });
    setErrors(result.errors);
    setRowErrors(result.ingredientErrors);
  };

  const focusFirstError = (errs: FieldErrors<DrinkField>) => {
    const first = FIELD_ORDER.find((f) => errs[f.field]);
    if (first) {
      const el = document.getElementById(first.id);
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const buildInput = (confirmed: boolean): DrinkInput => ({
    nome: nome.trim(),
    descricao: descricao.trim(),
    modo_preparo: preparo.trim(),
    tipo: tipo as DrinkType,
    publico,
    confirmouAviso: confirmed,
    ingredientes: ingredientes.map((d) => {
      const q = d.unidade === 'a_gosto' ? null : parseQuantity(d.quantidade);
      return { ingredient_id: d.ingredient.id, quantidade: q, unidade: d.unidade };
    }),
  });

  const save = async (confirmed: boolean) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(buildInput(confirmed), { file: imageFile, remove: removeImage }, setStage);
    } catch (error) {
      setSubmitError(toUserMessage(error, 'Não foi possível salvar o drink. Tente novamente.'));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
      setStage(null);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setAttempted(true);

    const result = validateDrinkForm(values);
    const allErrors: FieldErrors<DrinkField> = { ...result.errors };
    if (imageError) allErrors.imagem = imageError;
    setErrors(allErrors);
    setRowErrors(result.ingredientErrors);

    if (!result.valid || imageError) {
      setSubmitError('Revise os campos destacados antes de salvar.');
      focusFirstError(allErrors);
      return;
    }

    if (!compat.allowed) {
      const block = compat.issues.find((i) => i.level === 'block');
      setSubmitError(block?.message ?? 'A receita possui ingredientes incompatíveis.');
      document.getElementById('drink-compat')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    if (compat.requiresConfirmation) {
      setConfirmOpen(true);
      return;
    }

    void save(false);
  };

  const sectionClass = 'rounded-3xl border border-stone-200 bg-white p-5 sm:p-7';
  const sectionTitle = 'font-display text-lg font-semibold text-ink';

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className={sectionClass} aria-labelledby="sec-info">
          <h2 id="sec-info" className={sectionTitle}>
            Informações
          </h2>
          <div className="mt-5 space-y-5">
            <TextField
              id="drink-nome"
              label="Nome"
              required
              maxLength={LIMITS.nomeMax + 10}
              value={nome}
              placeholder="Ex.: Caipirinha de maracujá"
              onChange={(e) => {
                setNome(e.target.value);
                revalidate({ nome: e.target.value });
              }}
              error={errors.nome}
              hint={`${nome.trim().length}/${LIMITS.nomeMax} caracteres`}
              disabled={submitting}
            />
            <TextAreaField
              id="drink-descricao"
              label="Descrição"
              value={descricao}
              rows={3}
              placeholder="Uma frase que desperte vontade de provar."
              onChange={(e) => {
                setDescricao(e.target.value);
                revalidate({ descricao: e.target.value });
              }}
              error={errors.descricao}
              hint={`${descricao.trim().length}/${LIMITS.descricaoMax} caracteres · opcional`}
              disabled={submitting}
              className="min-h-20"
            />

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-stone-800">
                Tipo <span className="text-rose-700" aria-hidden="true">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-describedby={errors.tipo ? 'drink-tipo-error' : undefined}>
                {(
                  [
                    { value: 'drink', label: 'Drink', desc: 'Receita que pode levar álcool', icon: <IconGlass /> },
                    { value: 'mocktail', label: 'Mocktail', desc: 'Receita sem nenhum álcool', icon: <IconLeaf /> },
                  ] as const
                ).map((opt) => {
                  const checked = tipo === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600',
                        checked ? 'border-brand-700 bg-brand-50' : 'border-stone-300 hover:border-stone-400',
                      )}
                    >
                      <input
                        id={`drink-tipo-${opt.value}`}
                        type="radio"
                        name="tipo"
                        value={opt.value}
                        checked={checked}
                        disabled={submitting}
                        onChange={() => {
                          setTipo(opt.value);
                          revalidate({ tipo: opt.value });
                        }}
                        className="mt-1 h-4 w-4 accent-brand-800"
                      />
                      <span className={cn('mt-0.5', checked ? 'text-brand-800' : 'text-stone-500')} aria-hidden="true">
                        {opt.icon}
                      </span>
                      <span>
                        <span className="block font-medium text-ink">{opt.label}</span>
                        <span className="block text-sm text-stone-600">{opt.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.tipo && (
                <p id="drink-tipo-error" className="mt-1.5 flex gap-1 text-sm text-rose-700">
                  <span aria-hidden="true">⚠</span> {errors.tipo}
                </p>
              )}
            </fieldset>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-stone-50 p-4">
              <input
                type="checkbox"
                checked={publico}
                disabled={submitting}
                onChange={(e) => setPublico(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-brand-800"
              />
              <span>
                <span className="block text-sm font-medium text-ink">Receita pública</span>
                <span className="block text-sm text-stone-600">Desmarque para que apenas você consiga ver esta receita.</span>
              </span>
            </label>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="sec-imagem">
          <h2 id="sec-imagem" className="sr-only">
            Imagem
          </h2>
          <div id="drink-imagem" tabIndex={-1} className="focus:outline-none">
            <ImagePicker
              currentUrl={initial?.url_imagem ?? null}
              file={imageFile}
              onFileChange={setImageFile}
              removeExisting={removeImage}
              onRemoveExistingChange={setRemoveImage}
              error={imageError}
              onError={setImageError}
              disabled={submitting}
            />
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="sec-ingredientes">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sec-ingredientes" className={sectionTitle}>
              Ingredientes <span className="text-rose-700" aria-hidden="true">*</span>
            </h2>
            <span className="text-sm text-stone-500">
              {ingredientes.length}/{LIMITS.maxIngredientes}
            </span>
          </div>
          <div className="mt-5">
            <IngredientSelector
              inputId="drink-ingredientes"
              value={ingredientes}
              onChange={(next) => {
                setIngredientes(next);
                revalidate({ ingredientes: next });
              }}
              rowErrors={rowErrors}
              error={errors.ingredientes}
            />
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="sec-preparo">
          <h2 id="sec-preparo" className={sectionTitle}>
            Modo de preparo <span className="text-rose-700" aria-hidden="true">*</span>
          </h2>
          <div className="mt-5">
            <TextAreaField
              id="drink-preparo"
              label="Passo a passo"
              required
              rows={7}
              value={preparo}
              placeholder={'Ex.:\nMacere o limão com o açúcar.\nAdicione gelo e a cachaça.\nMexa e sirva.'}
              onChange={(e) => {
                setPreparo(e.target.value);
                revalidate({ modo_preparo: e.target.value });
              }}
              error={errors.modo_preparo}
              hint="Escreva um passo por linha — eles serão exibidos numerados."
              disabled={submitting}
            />
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CompatibilityPanel id="drink-compat" result={compat} hasIngredients={ingredientes.length > 0} />

        {submitError && (
          <div ref={errorRef} tabIndex={-1} className="focus:outline-none">
            <Alert tone="error" title="Não foi possível salvar">
              {submitError}
            </Alert>
          </div>
        )}

        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={submitting}
            loadingText={stage ? SAVE_STAGE_LABELS[stage] : 'Salvando drink...'}
          >
            {submitLabel}
          </Button>
          {!compat.allowed && ingredientes.length > 0 && (
            <p className="mt-3 text-center text-xs text-rose-700">Resolva os bloqueios de compatibilidade para salvar.</p>
          )}
          <ButtonLink to={cancelTo} variant="ghost" className="mt-2 w-full" aria-disabled={submitting}>
            Cancelar
          </ButtonLink>
          <p className="sr-only" role="status" aria-live="polite">
            {stage ? SAVE_STAGE_LABELS[stage] : ''}
          </p>
        </div>
      </aside>

      <StimulantConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void save(true);
        }}
      />
    </form>
  );
}

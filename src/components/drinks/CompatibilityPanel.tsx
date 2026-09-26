import type { CompatibilityResult } from '@/utils/compatibility';
import { ACID_DAIRY_MAX_RATIO } from '@/utils/compatibility';
import { cn } from '@/utils/cn';
import { IconAlert, IconBan, IconCheck } from '../ui/Icons';

interface CompatibilityPanelProps {
  result: CompatibilityResult;
  hasIngredients: boolean;
  id?: string;
}

/** Painel de alertas de compatibilidade (ícone + título + texto, nunca só cor). */
export function CompatibilityPanel({ result, hasIngredients, id }: CompatibilityPanelProps) {
  const { issues, stats } = result;
  const showRatio = stats.acidMl > 0 && stats.dairyMl > 0;

  return (
    <section id={id} aria-labelledby={`${id ?? 'compat'}-title`} aria-live="polite" className="rounded-3xl border border-stone-200 bg-white p-5">
      <h3 id={`${id ?? 'compat'}-title`} className="text-sm font-semibold text-ink">
        Verificação de segurança
      </h3>

      {!hasIngredients ? (
        <p className="mt-2 text-sm text-stone-500">Adicione ingredientes para verificar a compatibilidade da receita.</p>
      ) : issues.length === 0 ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-emerald-800">
          <IconCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Nenhum alerta de compatibilidade entre os ingredientes.</span>
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {issues.map((issue) => {
            const blocking = issue.level === 'block';
            return (
              <li
                key={issue.id}
                className={cn(
                  'flex gap-3 rounded-2xl border p-3.5 text-sm',
                  blocking ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950',
                )}
              >
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {blocking ? <IconBan size={18} /> : <IconAlert size={18} />}
                </span>
                <div>
                  <p className="font-semibold">
                    {blocking ? 'Bloqueado: ' : 'Requer confirmação: '}
                    {issue.title}
                  </p>
                  <p className="mt-1 leading-relaxed">{issue.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showRatio && (
        <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
          Ácido forte ≈ {Math.round(stats.acidMl)} ml · Laticínio ≈ {Math.round(stats.dairyMl)} ml · Proporção{' '}
          {Math.round((stats.ratio ?? 0) * 100)}% (limite {Math.round(ACID_DAIRY_MAX_RATIO * 100)}%)
        </p>
      )}
    </section>
  );
}

import type { ReactNode } from 'react';
import type { Drink } from '@/types/database';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';
import { Alert, DrinkCardSkeleton, EmptyState } from '../ui/Feedback';
import { IconSearch } from '../ui/Icons';
import { DrinkCard } from './DrinkCard';

interface DrinkGridProps {
  drinks: Drink[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  skeletonCount?: number;
  empty?: ReactNode;
  showIngredients?: boolean;
  className?: string;
  loadingLabel?: string;
}

export function DrinkGrid({
  drinks,
  loading,
  error,
  onRetry,
  skeletonCount = 6,
  empty,
  showIngredients,
  className,
  loadingLabel = 'Carregando drinks...',
}: DrinkGridProps) {
  const gridClass = cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className);

  if (loading) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          {loadingLabel}
        </p>
        <div className={gridClass}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <DrinkCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        tone="error"
        title={error}
        action={
          onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          )
        }
      />
    );
  }

  if (drinks.length === 0) {
    return <>{empty ?? <EmptyState icon={<IconSearch />} title="Nenhum drink encontrado." />}</>;
  }

  return (
    <ul className={gridClass}>
      {drinks.map((drink) => (
        <li key={drink.id} className="flex">
          <DrinkCard drink={drink} showIngredients={showIngredients} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

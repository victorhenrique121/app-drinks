import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { IconGlass } from '@/components/ui/Icons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Página não encontrada');
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <EmptyState
        icon={<IconGlass />}
        title="Página não encontrada."
        description="O endereço que você acessou não existe ou foi movido."
        action={<ButtonLink to="/">Voltar ao início</ButtonLink>}
      />
    </div>
  );
}

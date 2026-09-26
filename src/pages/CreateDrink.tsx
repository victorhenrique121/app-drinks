import { useNavigate } from 'react-router-dom';
import { DrinkForm } from '@/components/drinks/DrinkForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useToast } from '@/hooks/useToast';
import { createDrink } from '@/services/drinks';

export default function CreateDrink() {
  useDocumentTitle('Criar drink');
  const navigate = useNavigate();
  const { notify } = useToast();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Criar drink</h1>
        <p className="mt-2 text-stone-600">
          Compartilhe sua receita. Verificamos automaticamente a compatibilidade dos ingredientes antes de salvar.
        </p>
      </header>
      <DrinkForm
        submitLabel="Salvar drink"
        cancelTo="/drinks"
        onSubmit={async (input, image, onStage) => {
          const id = await createDrink(input, image.file, onStage);
          notify(`“${input.nome}” foi criado com sucesso!`, 'success');
          navigate(`/drinks/${id}`, { replace: true });
        }}
      />
    </div>
  );
}

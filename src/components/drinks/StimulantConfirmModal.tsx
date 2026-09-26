import { useEffect, useId, useState } from 'react';
import { Button } from '../ui/Button';
import { IconAlert } from '../ui/Icons';
import { Modal } from '../ui/Modal';

interface StimulantConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmação explícita para álcool + estimulante.
 * O botão só é habilitado após marcar a caixa. O banco também exige
 * aviso_estimulante_confirmado = true para aceitar a receita.
 */
export function StimulantConfirmModal({ open, onCancel, onConfirm }: StimulantConfirmModalProps) {
  const [checked, setChecked] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onCancel}
      role="alertdialog"
      tone="warning"
      icon={<IconAlert />}
      title="Atenção"
      description={
        <>
          <p>Esta receita combina álcool com um ingrediente estimulante.</p>
          <p className="mt-2">
            Essa combinação pode aumentar riscos associados ao consumo, pois o estimulante pode alterar a percepção dos efeitos do
            álcool.
          </p>
          <p className="mt-2 font-medium text-ink">Deseja continuar?</p>
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Voltar e revisar
          </Button>
          <Button onClick={onConfirm} disabled={!checked}>
            Continuar e salvar
          </Button>
        </>
      }
    >
      <label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          data-autofocus
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-800"
        />
        <span className="font-medium">Entendo o aviso e quero continuar</span>
      </label>
    </Modal>
  );
}

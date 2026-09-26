import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/utils/cn';
import { ACCEPTED_IMAGE_EXTENSIONS, validateImageFile } from '@/utils/validation';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Feedback';
import { IconImage, IconTrash } from '../ui/Icons';

interface ImagePickerProps {
  /** URL da imagem já salva (edição). */
  currentUrl: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Marca a imagem existente para remoção. */
  removeExisting: boolean;
  onRemoveExistingChange: (remove: boolean) => void;
  error?: string;
  onError: (message: string | undefined) => void;
  disabled?: boolean;
}

export function ImagePicker({
  currentUrl,
  file,
  onFileChange,
  removeExisting,
  onRemoveExistingChange,
  error,
  onError,
  disabled,
}: ImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    setChecking(true);
    const message = await validateImageFile(selected);
    setChecking(false);
    if (message) {
      onError(message);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onError(undefined);
    onFileChange(selected);
    onRemoveExistingChange(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void handleFile(e.dataTransfer.files?.[0]);
  };

  const shownUrl = preview ?? (!removeExisting ? currentUrl : null);

  const clear = () => {
    if (file) {
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = '';
    } else if (currentUrl) {
      onRemoveExistingChange(true);
    }
    onError(undefined);
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-800" id={`${inputId}-label`}>
        Imagem <span className="font-normal text-stone-500">(opcional)</span>
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-3xl border-2 border-dashed transition-colors',
          dragging ? 'border-brand-600 bg-brand-50' : error ? 'border-rose-400 bg-rose-50/40' : 'border-stone-300 bg-white',
        )}
      >
        {shownUrl ? (
          <div className="relative aspect-[4/3] sm:aspect-[16/9]">
            <img src={shownUrl} alt="Pré-visualização da imagem do drink" className="h-full w-full object-cover" />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
                Trocar imagem
              </Button>
              <Button size="sm" variant="outline" onClick={clear} disabled={disabled} icon={<IconTrash size={16} />} aria-label="Remover imagem">
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-800" aria-hidden="true">
              {checking ? <Spinner size={20} /> : <IconImage />}
            </span>
            <p className="mt-3 text-sm text-stone-700">
              Arraste uma foto aqui ou{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="font-semibold text-brand-800 underline underline-offset-2 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
              >
                escolha um arquivo
              </button>
            </p>
            <p className="mt-1 text-xs text-stone-500">JPG, PNG ou WEBP · até 5 MB</p>
            {removeExisting && currentUrl && (
              <button
                type="button"
                onClick={() => onRemoveExistingChange(false)}
                className="mt-3 text-xs font-medium text-stone-600 underline hover:text-ink"
              >
                Desfazer remoção da imagem atual
              </button>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_EXTENSIONS}
          className="sr-only"
          aria-labelledby={`${inputId}-label`}
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 flex items-start gap-1 text-sm text-rose-700" role="alert">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}

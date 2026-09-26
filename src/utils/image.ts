import { AppError } from './errors';
import { validateImageFile } from './validation';

/**
 * Prepara a imagem para upload:
 *  - valida tipo real e tamanho;
 *  - redimensiona (lado maior <= maxSize);
 *  - re-codifica em JPEG (remove metadados EXIF e padroniza {drink_id}.jpg).
 */
export async function prepareDrinkImage(file: File, maxSize = 1600, quality = 0.85): Promise<Blob> {
  const error = await validateImageFile(file);
  if (error) throw new AppError(error);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AppError('Não foi possível processar a imagem.');
    ctx.fillStyle = '#ffffff'; // fundo branco para PNG/WEBP com transparência
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new AppError('Não foi possível processar a imagem.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new AppError('Não foi possível ler a imagem. Tente outro arquivo.'));
    img.src = src;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AppError('Não foi possível processar a imagem.'));
    reader.readAsDataURL(blob);
  });
}

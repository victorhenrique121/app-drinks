import { useEffect } from 'react';

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Copo Certo` : 'Copo Certo — receitas de drinks e mocktails';
  }, [title]);
}

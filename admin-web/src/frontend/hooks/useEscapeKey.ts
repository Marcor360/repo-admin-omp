import { useEffect } from 'react';

/** Cierra un diálogo/menú con Escape. Pasa `active = false` si el componente
 * sigue montado mientras está "cerrado" (para no escuchar sin necesidad). */
export function useEscapeKey(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onEscape();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);
}

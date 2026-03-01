import { useEffect } from 'react';

/**
 * Hook to show a confirmation dialog when the user tries to leave the page
 * with unsaved changes
 *
 * @param isDirty - Whether there are unsaved changes
 * @param message - Custom message to show (some browsers ignore this)
 */
export function useBeforeUnload(isDirty: boolean, message?: string) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we set it anyway
        e.returnValue = message || '저장하지 않은 변경 사항이 있습니다. 정말 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);
}

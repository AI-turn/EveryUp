import { useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Hook for copying text to clipboard with toast notification
 */
export function useCopyToClipboard() {
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사되었습니다.');
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('복사에 실패했습니다.');
      return false;
    }
  }, []);

  return { copy };
}

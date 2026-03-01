import { MaterialIcon } from '../common';

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-bg-main-dark p-8">
      <div className="text-center max-w-md">
        {/* 에러 아이콘 */}
        <MaterialIcon
          name="error_outline"
          className="text-8xl text-red-500 mb-4"
        />

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          문제가 발생했습니다
        </h1>

        {/* 설명 */}
        <p className="text-slate-600 dark:text-text-muted-dark mb-4">
          예기치 않은 오류가 발생했습니다. 페이지를 새로고침하거나 홈으로
          돌아가세요.
        </p>

        {/* 에러 메시지 (개발 모드) */}
        {import.meta.env.DEV && error && (
          <pre className="text-left text-xs bg-slate-100 dark:bg-ui-hover-dark p-4 rounded-lg mb-4 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}

        {/* 버튼들 */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 border border-slate-300 dark:border-ui-border-dark text-slate-700 dark:text-text-secondary-dark font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-ui-hover-dark transition-colors"
          >
            다시 시도
          </button>
          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

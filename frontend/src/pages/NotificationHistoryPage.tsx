import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MaterialIcon, PageHeader } from '../components/common';
import { api, NotificationHistory, NotificationHistoryFilter, NotificationStats } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function NotificationHistoryPage() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationHistoryFilter>({
    limit: 50,
    offset: 0,
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadHistory();
    loadStats();
  }, [filter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.getNotificationHistory(filter);
      setHistory(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to load notification history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await api.getNotificationHistoryStats(7);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setFilter(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status,
      offset: 0,
    }));
  };

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type);
    setFilter(prev => ({
      ...prev,
      alert_type: type === 'all' ? undefined : type,
      offset: 0,
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <MaterialIcon name="check_circle" className="text-green-500" />;
      case 'failed':
        return <MaterialIcon name="error" className="text-red-500" />;
      case 'pending':
        return <MaterialIcon name="schedule" className="text-yellow-500" />;
      default:
        return <MaterialIcon name="help" className="text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'resource':
        return <MaterialIcon name="memory" className="text-blue-500" />;
      case 'healthcheck':
        return <MaterialIcon name="favorite" className="text-pink-500" />;
      case 'log':
        return <MaterialIcon name="description" className="text-orange-500" />;
      case 'scheduled':
        return <MaterialIcon name="schedule" className="text-purple-500" />;
      default:
        return <MaterialIcon name="notifications" className="text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;

    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[severity] || colors.info}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        title="알림 히스토리"
        subtitle="발송된 모든 알림 기록을 확인하세요"
      >
        <button
          onClick={loadHistory}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-bg-surface-dark hover:bg-slate-200 dark:hover:bg-ui-hover-dark rounded-lg text-sm font-bold transition-all text-slate-900 dark:text-white shadow-sm border border-transparent dark:border-ui-border-dark"
        >
          <MaterialIcon name="refresh" className="text-lg" />
          새로고침
        </button>
      </PageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-bg-surface-dark rounded-lg p-4 shadow-sm border border-gray-200 dark:border-ui-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 발송</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSent}</p>
              </div>
              <MaterialIcon name="send" className="text-3xl text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-bg-surface-dark rounded-lg p-4 shadow-sm border border-gray-200 dark:border-ui-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">실패</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFailed}</p>
              </div>
              <MaterialIcon name="error_outline" className="text-3xl text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-bg-surface-dark rounded-lg p-4 shadow-sm border border-gray-200 dark:border-ui-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">성공률</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.successRate.toFixed(1)}%
                </p>
              </div>
              <MaterialIcon name="check_circle" className="text-3xl text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-bg-surface-dark rounded-lg p-4 shadow-sm border border-gray-200 dark:border-ui-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">총 알림</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSent + stats.totalFailed}
                </p>
              </div>
              <MaterialIcon name="notifications_active" className="text-3xl text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-bg-surface-dark rounded-lg p-4 mb-6 shadow-sm border border-gray-200 dark:border-ui-border-dark">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-ui-border-dark rounded-lg bg-white dark:bg-bg-dark text-gray-900 dark:text-white"
            >
              <option value="all">전체</option>
              <option value="sent">성공</option>
              <option value="failed">실패</option>
              <option value="pending">대기중</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              알림 타입
            </label>
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-ui-border-dark rounded-lg bg-white dark:bg-bg-dark text-gray-900 dark:text-white"
            >
              <option value="all">전체</option>
              <option value="resource">리소스</option>
              <option value="healthcheck">헬스체크</option>
              <option value="log">로그</option>
              <option value="scheduled">스케줄</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-bg-surface-dark rounded-lg shadow-sm border border-gray-200 dark:border-ui-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-ui-border-dark">
            <thead className="bg-gray-50 dark:bg-bg-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  타입
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  채널
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  메시지
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  심각도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  재시도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  시간
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-bg-surface-dark divide-y divide-gray-200 dark:divide-ui-border-dark">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <MaterialIcon name="hourglass_empty" className="text-4xl animate-spin mx-auto mb-2" />
                    <p>로딩 중...</p>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <MaterialIcon name="inbox" className="text-4xl mx-auto mb-2" />
                    <p>알림 히스토리가 없습니다</p>
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-ui-hover-dark transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.alertType)}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {item.alertType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MaterialIcon
                          name={item.channelType === 'discord' ? 'discord' : 'telegram'}
                          className="text-lg"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {item.channelName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          {item.message}
                        </p>
                        {item.errorMessage && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                            Error: {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSeverityBadge(item.severity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {item.retryCount > 0 ? `${item.retryCount}회` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-ui-border-dark">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                총 <span className="font-medium">{total}</span>개 중 {filter.offset || 0 + 1}-
                {Math.min((filter.offset || 0) + (filter.limit || 50), total)}개 표시
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter(prev => ({ ...prev, offset: Math.max(0, (prev.offset || 0) - 50) }))}
                  disabled={(filter.offset || 0) === 0}
                  className="px-3 py-1 border border-gray-300 dark:border-ui-border-dark rounded disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setFilter(prev => ({ ...prev, offset: (prev.offset || 0) + 50 }))}
                  disabled={(filter.offset || 0) + 50 >= total}
                  className="px-3 py-1 border border-gray-300 dark:border-ui-border-dark rounded disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSidePanel } from '../contexts/SidePanelContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { LogServiceForm } from '../features/logs';
import { LogListDesktopView } from '../features/logs/components/LogListDesktopView';
import { LogListMobileView } from '../features/logs/components/LogListMobileView';
import { api, Service } from '../services/api';

export function LogListPage() {
  const { t } = useTranslation(['logs', 'healthcheck', 'common']);
  const navigate = useNavigate();
  const { openPanel } = useSidePanel();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const data = await api.getServices();
      setServices(data.filter((s) => s.type === 'log'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAddService = () => {
    openPanel(
      t('logServices.add.title', { defaultValue: 'Add Log Service' }),
      <LogServiceForm onSuccess={fetchServices} />
    );
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.tags?.[0] || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sharedProps = {
    services,
    filteredServices,
    loading,
    error,
    searchQuery,
    onSearchChange: setSearchQuery,
    onAddService: handleAddService,
    onServiceClick: (id: string) => navigate(`/logs/${id}`),
  } as const;

  if (isMobile) return <LogListMobileView {...sharedProps} />;

  return <LogListDesktopView {...sharedProps} />;
}

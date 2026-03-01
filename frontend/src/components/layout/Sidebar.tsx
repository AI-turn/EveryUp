import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '../common';
import { useSidebar } from '../../contexts/SidebarContext';

const navItems: { icon: string; labelKey: string; href: string }[] = [
  { icon: 'home', labelKey: 'nav.dashboard', href: '/' },
  { icon: 'monitor_heart', labelKey: 'nav.healthcheck', href: '/services' },
  { icon: 'article', labelKey: 'nav.logs', href: '/logs' },
  { icon: 'dns', labelKey: 'nav.monitoring', href: '/monitoring' },
  { icon: 'notifications', labelKey: 'nav.alerts', href: '/alerts' },
  { icon: 'settings', labelKey: 'nav.settings', href: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isCollapsed } = useSidebar();

  return (
    <aside
      className={`
        flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-ui-border-dark
        bg-white dark:bg-bg-main-dark relative
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[72px]' : 'w-64'}
      `}
    >
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-ui-border-dark">
        <nav className={`space-y-1 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                title={isCollapsed ? t(item.labelKey) : undefined}
                className={`
                  flex items-center rounded-lg transition-all duration-200
                  ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'}
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-ui-hover-dark dark:hover:text-white'
                  }
                `}
              >
                <MaterialIcon name={item.icon} className={`transition-all duration-200 ${isCollapsed ? 'text-xl' : ''}`} />
                <span
                  className={`
                    text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                    ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                  `}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Floating Toggle Button (Appears on Hover) */}

    </aside>
  );
}

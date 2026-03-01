export type ServiceStatus = 'healthy' | 'degraded' | 'warning' | 'offline';

export interface NavItem {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface Incident {
  id: string;
  time: string;
  type: 'error' | 'warning' | 'success' | 'info';
  serviceName: string;
  message: string;
}

export interface KPIData {
  icon: string;
  label: string;
  value: string;
  subValue: string;
  color: 'primary' | 'red' | 'emerald';
  /** Optional navigation target — card becomes clickable when set */
  href?: string;
}

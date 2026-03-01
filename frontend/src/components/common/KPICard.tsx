import { MaterialIcon } from './MaterialIcon';

interface KPICardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon: string;
    color: 'primary' | 'red' | 'emerald' | 'amber';
    subValueColor?: string;
    onClick?: () => void;
}

const colorConfig = {
    primary: {
        bg: 'bg-primary/10',
        text: 'text-primary',
    },
    red: {
        bg: 'bg-red-500/10',
        text: 'text-red-500',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-500',
    },
    amber: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
    },
};

export function KPICard({
    label,
    value,
    subValue,
    icon,
    color,
    subValueColor,
    onClick,
}: KPICardProps) {
    const config = colorConfig[color] || colorConfig.primary;

    // Default subValue color based on color prop if not explicitly provided
    const resolvedSubValueColor = subValueColor || (
        color === 'red' ? 'text-red-500' :
            color === 'emerald' ? 'text-emerald-500' :
                color === 'amber' ? 'text-amber-500' :
                    'text-slate-500'
    );

    const isClickable = !!onClick;

    return (
        <div
            onClick={onClick}
            className={[
                'bg-white dark:bg-bg-surface-dark border border-slate-200 dark:border-ui-border-dark rounded-xl p-6 flex items-center gap-4 transition-all duration-150',
                isClickable
                    ? 'cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
                    : '',
            ].join(' ')}
        >
            <div className={`w-12 h-12 rounded-lg ${config.bg} flex items-center justify-center ${config.text}`}>
                <MaterialIcon name={icon} className="text-3xl" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-text-muted-dark">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
                    {subValue && (
                        <span className={`text-xs ${resolvedSubValueColor} font-medium`}>{subValue}</span>
                    )}
                </div>
            </div>
            {isClickable && (
                <MaterialIcon name="chevron_right" className="text-slate-400 dark:text-text-dim-dark shrink-0" />
            )}
        </div>
    );
}

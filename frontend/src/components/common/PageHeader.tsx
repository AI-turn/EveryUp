import React from 'react';
import { MaterialIcon } from './MaterialIcon';

export interface PageFeature {
    icon: string;
    label: string;
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    features?: PageFeature[];
    children?: React.ReactNode; // For actions/buttons
}

export function PageHeader({ title, subtitle, features, children }: PageHeaderProps) {
    return (
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{title}</h1>
                    {subtitle && (
                        <p className="text-slate-600 dark:text-text-muted-dark max-w-2xl">
                            {subtitle}
                        </p>
                    )}
                </div>
                {children && (
                    <div className="flex items-center gap-3">
                        {children}
                    </div>
                )}
            </div>

            {features && features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {features.map((f) => (
                        <span
                            key={f.label}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 dark:border-ui-border-dark text-slate-500 dark:text-text-muted-dark text-xs font-medium"
                        >
                            <MaterialIcon name={f.icon} className="text-sm text-primary" />
                            {f.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

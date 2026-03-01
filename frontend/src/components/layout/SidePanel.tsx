import { useEffect, useRef } from 'react';
import { MaterialIcon } from '../common';
import { useSidePanel } from '../../contexts/SidePanelContext';

export function SidePanel() {
    const { isOpen, title, content, closePanel } = useSidePanel();
    const panelRef = useRef<HTMLDivElement>(null);

    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                closePanel();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, closePanel]);

    return (
        <>
            {/* Mobile Backdrop - only visible/active on mobile when panel is open */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-500 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={closePanel}
                aria-hidden="true"
            />

            {/* Side Panel */}
            <div
                ref={panelRef}
                className={`
          fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] lg:w-[600px] 
          bg-white dark:bg-bg-surface-dark border-l border-slate-200 dark:border-ui-border-dark
          shadow-2xl transform transition-transform duration-500 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
                style={{
                    transitionProperty: 'transform'
                }}
            >
                <div className="flex flex-col h-full min-w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 h-16 border-b border-slate-200 dark:border-ui-border-dark bg-white dark:bg-bg-surface-dark sticky top-0 z-10 transition-colors duration-200">
                        <div className="flex items-center gap-3">
                            <MaterialIcon name="apps" className="text-slate-400 dark:text-text-muted-dark" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                {title}
                            </h2>
                        </div>
                        <button
                            type="button"
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-text-base-dark rounded-lg hover:bg-slate-100 dark:hover:bg-ui-hover-dark transition-colors"
                            onClick={closePanel}
                        >
                            <MaterialIcon name="close" className="text-xl" />
                            <span className="sr-only">Close panel</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                        {content}
                    </div>
                </div>
            </div>
        </>
    );
}

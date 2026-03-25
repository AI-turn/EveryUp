import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import logoDark from '../../assets/logo-dark.png';
import { NotificationDropdown } from './NotificationDropdown';
import { useIsMobile } from '../../hooks/useMediaQuery';

function IconSun() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
        </svg>
    );
}

function IconMoon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}


export function Header() {
    const { theme, toggleTheme } = useTheme();
    const { i18n } = useTranslation('common');
    const [notifOpen, setNotifOpen] = useState(false);
    const isMobile = useIsMobile();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const toggleLanguage = () => {
        const next = i18n.language.startsWith('ko') ? 'en' : 'ko';
        i18n.changeLanguage(next);
    };

    return (
        <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-ui-border-dark bg-white dark:bg-bg-main-dark flex items-center justify-between px-4 shrink-0 transition-colors duration-200 z-30 relative">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0 z-10 transition-transform active:scale-95">
                <div className="flex items-center justify-center h-10 w-10 overflow-hidden">
                    <img src={theme === 'dark' ? logoDark : logo} alt="Monitoring Logo" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-primary transition-colors">EveryUp</h1>
                </div>
            </Link>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 lg:gap-6 z-10">
                {/* Language Switcher */}
                {isMobile ? (
                    <button
                        onClick={toggleLanguage}
                        aria-label={i18n.language.startsWith('ko') ? 'Switch to English' : '한국어로 전환'}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-bg-surface-dark text-xs font-bold text-slate-600 dark:text-text-muted-dark active:scale-95 transition-all"
                    >
                        {i18n.language.startsWith('ko') ? 'EN' : 'KO'}
                    </button>
                ) : (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-bg-surface-dark p-1 rounded-lg">
                        <button
                            onClick={() => changeLanguage('ko')}
                            className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${i18n.language.startsWith('ko')
                                ? 'bg-white dark:bg-ui-hover-dark text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-text-muted-dark dark:hover:text-white'
                                }`}
                        >
                            KO
                        </button>
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${i18n.language.startsWith('en')
                                ? 'bg-white dark:bg-ui-hover-dark text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:text-text-muted-dark dark:hover:text-white'
                                }`}
                        >
                            EN
                        </button>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                    {!isMobile && (
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-ui-hover-dark text-slate-500 dark:text-text-muted-dark hover:text-slate-700 dark:hover:text-white transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <IconMoon /> : <IconSun />}
                        </button>
                    )}
                    <NotificationDropdown
                        open={notifOpen}
                        onToggle={() => setNotifOpen(v => !v)}
                        onClose={() => setNotifOpen(false)}
                    />
                </div>
            </div>
        </header>
    );
}

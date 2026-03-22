import type { ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SidebarProvider } from '../contexts/SidebarContext';
import { SidePanelProvider } from '../contexts/SidePanelContext';

/**
 * Composes all app-level React context providers in the required dependency order:
 *
 *   AuthProvider        — must wrap all authenticated UI
 *     ThemeProvider     — reads user theme preference (may depend on auth state)
 *       SidebarProvider — UI state (no external deps)
 *         SidePanelProvider — UI state (no external deps)
 *
 * If you add a new provider, document its position and reason here.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <SidePanelProvider>
            {children}
          </SidePanelProvider>
        </SidebarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

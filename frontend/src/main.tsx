import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import './i18n.ts';
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { SidebarProvider } from './contexts/SidebarContext.tsx'
import { ErrorBoundary } from './components/error/index.ts'
import { AuthProvider } from './contexts/AuthContext.tsx'

import { SidePanelProvider } from './contexts/SidePanelContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <SidebarProvider>
            <SidePanelProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--toast-bg, #fff)',
                    color: 'var(--toast-color, #1e293b)',
                    border: '1px solid var(--toast-border, #e2e8f0)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </SidePanelProvider>
          </SidebarProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { createContext, useContext, useState, ReactNode } from 'react'

const STORAGE_KEY = 'mt_jwt_token'

interface User {
  user_id: number
  username: string
  role: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  login: (token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function parseJWTUser(token: string): User | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      user_id: decoded.user_id,
      username: decoded.username,
      role: decoded.role,
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  )
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseJWTUser(stored) : null
  })

  function login(newToken: string) {
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setUser(parseJWTUser(newToken))
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

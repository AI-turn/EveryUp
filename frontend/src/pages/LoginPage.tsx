import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { env } from '../config/env'
import { MaterialIcon } from '../components/common'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if first-run setup is needed
  useEffect(() => {
    fetch(`${env.apiBaseUrl}/auth/setup/status`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setNeedsSetup(json.data.needs_setup)
      })
      .catch(() => setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.'))
  }, [])

  if (isAuthenticated) {
    navigate(from, { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const endpoint = needsSetup ? '/auth/setup' : '/auth/login'

    try {
      const res = await fetch(`${env.apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()
      if (json.success) {
        login(json.data.token)
        navigate(from, { replace: true })
      } else {
        setError(json.error?.message || '오류가 발생했습니다')
        setLoading(false)
      }
    } catch {
      setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.')
      setLoading(false)
    }
  }

  // Still loading setup status
  if (needsSetup === null && !error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <MaterialIcon name="progress_activity" className="text-4xl text-primary animate-spin" />
      </div>
    )
  }

  const isSetup = needsSetup === true

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <MaterialIcon name="monitor_heart" className="text-3xl text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSetup ? '초기 설정' : 'EveryUp'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isSetup ? '관리자 계정을 생성하세요' : '관리자 계정으로 로그인하세요'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <MaterialIcon name="error_outline" className="text-base mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSetup && (
            <div className="flex items-start gap-2 text-blue-400 text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5">
              <MaterialIcon name="info" className="text-base mt-0.5 shrink-0" />
              <span>처음 실행되었습니다. 관리자 계정을 설정하세요.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">사용자 이름</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">비밀번호{isSetup && ' (최소 8자)'}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-primary"
                placeholder={isSetup ? '최소 8자 이상' : '비밀번호 입력'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors mt-2"
            >
              {loading && <MaterialIcon name="progress_activity" className="text-base animate-spin" />}
              {loading ? '처리 중...' : isSetup ? '계정 생성' : '로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          이 계정으로 모니터링 시스템에 접근합니다
        </p>
      </div>
    </div>
  )
}

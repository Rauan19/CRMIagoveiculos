'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

const LOGO_SRC = '/logo/loiago.jpeg'

/** Máscara por luminância: pixels escuros (fundo preto do JPEG) somem; cores do logo permanecem. */
const logoKnockoutMask: CSSProperties = {
  WebkitMaskImage: `url(${LOGO_SRC})`,
  WebkitMaskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskImage: `url(${LOGO_SRC})`,
  maskSize: 'contain',
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  maskMode: 'luminance',
}

function LoginBrandLogo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm ${className ?? ''}`}
    >
      <img
        src={LOGO_SRC}
        alt="Iago Veículos"
        className={imgClassName}
        style={logoKnockoutMask}
      />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, checkAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuth()
    }, 100)
    return () => clearTimeout(timer)
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Decoração suave */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-20 right-0 lg:right-[10%] w-[min(420px,90vw)] h-[min(420px,90vw)] rounded-full bg-primary-100/50 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[min(360px,80vw)] h-[min(360px,80vw)] rounded-full bg-slate-200/35 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-px h-40 bg-gradient-to-b from-transparent via-slate-200/80 to-transparent hidden lg:block" />
      </div>

      {/* Painel marca — desktop */}
      <div
        className={`hidden lg:flex lg:w-[42%] xl:w-1/2 relative items-center justify-center p-10 xl:p-14 border-r border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/90 backdrop-blur-sm transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="max-w-sm text-center relative z-10">
          <LoginBrandLogo
            className="mx-auto mb-8 w-full max-w-xs px-4 py-3 xl:max-w-sm xl:px-5 xl:py-4"
            imgClassName="h-40 xl:h-48 w-auto max-w-full object-contain"
          />
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            Iago Veículos
          </h1>
          <p className="mt-2 text-slate-600 text-sm leading-relaxed">
            Sistema de gerenciamento — organize vendas, estoque e financeiro em um só lugar.
          </p>
          <p className="mt-6 text-xs text-slate-400 uppercase tracking-widest">
            Acesso seguro
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12 lg:px-10 relative z-10">
        {/* Logo mobile */}
        <div
          className={`lg:hidden w-full max-w-md mb-8 text-center transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <LoginBrandLogo
            className="mx-auto mb-3 max-w-[200px] px-3 py-2 sm:max-w-[220px]"
            imgClassName="h-20 sm:h-24 w-auto max-w-full object-contain"
          />
          <p className="text-sm text-slate-600 font-medium">Iago Veículos</p>
        </div>

        <div
          className={`w-full max-w-md transition-all duration-500 delay-75 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10">
            <div className="space-y-1 mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-slate-600">
                Entre com seu e-mail e senha para continuar
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3 text-sm text-red-800 animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/80 text-slate-900 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 focus:bg-white hover:border-slate-300"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 pr-11 text-sm border border-slate-200 rounded-xl bg-slate-50/80 text-slate-900 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 focus:bg-white hover:border-slate-300"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-600/20 transition hover:shadow-lg hover:shadow-primary-600/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Não tem uma conta?{' '}
              <Link
                href="/register"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-4px);
          }
          40%,
          80% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.45s ease-out;
        }
      `}</style>
    </div>
  )
}

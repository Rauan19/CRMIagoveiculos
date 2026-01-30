'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, checkAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Verificar se já está autenticado ao carregar a página
  useEffect(() => {
    // Aguardar um pouco para o Zustand restaurar do localStorage
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
    <div className="min-h-screen flex relative overflow-hidden bg-black">
      {/* Lado esquerdo - Logo com fundo animado */}
      <div className="hidden lg:flex lg:w-1/2 bg-black items-center justify-center p-12 relative overflow-hidden">
        {/* Partículas animadas de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        <div className={`max-w-md text-center relative z-10 transform transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div
            className="w-full h-48 bg-contain bg-center bg-no-repeat mx-auto mb-8 transform transition-all duration-1000 hover:scale-105"
            style={{
              backgroundImage: 'url(/logo/loiago.jpeg)',
              animation: mounted ? 'fadeInUp 0.8s ease-out' : 'none'
            }}
          />
          <p className="text-xl text-gray-300 font-light tracking-wide transform transition-all duration-1000 delay-300" style={{ animation: mounted ? 'fadeInUp 0.8s ease-out 0.2s both' : 'none' }}>
            Sistema de gerenciamento da Iago Veiculos
          </p>
          <p className="text-sm text-gray-400 mt-4 transform transition-all duration-1000 delay-500" style={{ animation: mounted ? 'fadeInUp 0.8s ease-out 0.4s both' : 'none' }}>
            Gerencie seu negócio de forma inteligente
          </p>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex-1 flex items-center justify-center bg-black py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Logo visível em telas pequenas */}
        <div className="absolute top-0 left-0 right-0 bg-black py-6 lg:hidden">
          <div className="text-center transform transition-all duration-1000" style={{ animation: mounted ? 'fadeInDown 0.8s ease-out' : 'none' }}>
            <div
              className="w-32 h-20 bg-contain bg-center bg-no-repeat mx-auto mb-4 transform hover:scale-105 transition-transform duration-300"
              style={{
                backgroundImage: 'url(/logo/loiago.jpeg)',
              }}
            />
            <p className="text-sm text-gray-300">
              Sistema de gerenciamento da Iago Veiculos
            </p>
          </div>
        </div>
        
        <div className={`max-w-md w-full space-y-6 sm:space-y-8 relative z-10 mt-40 sm:mt-0 transform transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`} style={{ animation: mounted ? 'fadeInRight 0.8s ease-out 0.3s both' : 'none' }}>

          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold text-white tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-gray-300">
              Faça login em sua conta para continuar
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-900 border border-red-700 p-4 animate-shake transform transition-all duration-300">
                <div className="text-sm text-red-200 font-medium">{error}</div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="transform transition-all duration-300 hover:scale-[1.01]">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 text-sm border-2 border-gray-700 bg-gray-900 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 transition-all duration-300 hover:border-gray-600 shadow-sm"
                  placeholder="seu@email.com"
                />
              </div>
              <div className="transform transition-all duration-300 hover:scale-[1.01]">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-300 mb-1">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 text-sm border-2 border-gray-700 bg-gray-900 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 transition-all duration-300 hover:border-gray-600 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <p className="text-sm text-gray-300">
              Não tem uma conta?{' '}
              <Link
                href="/register"
                className="font-semibold text-primary-400 hover:text-primary-300 transition-colors duration-200 hover:underline"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro ao criar conta' }))
        throw new Error(error.error || 'Erro ao criar conta')
      }

      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Lado esquerdo - Logo com fundo animado */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-black via-gray-900 to-black items-center justify-center p-12 relative overflow-hidden">
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
              backgroundImage: 'url(/logo/logo2-Photoroom.png)',
              animation: mounted ? 'fadeInUp 0.8s ease-out' : 'none'
            }}
          />
          <p className="text-xl text-gray-300 font-light tracking-wide transform transition-all duration-1000 delay-300" style={{ animation: mounted ? 'fadeInUp 0.8s ease-out 0.2s both' : 'none' }}>
            Sistema de gerenciamento da Iago Veiculos
          </p>
          <p className="text-sm text-gray-400 mt-4 transform transition-all duration-1000 delay-500" style={{ animation: mounted ? 'fadeInUp 0.8s ease-out 0.4s both' : 'none' }}>
            Junte-se a nós e transforme seu negócio
          </p>
        </div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex-1 flex items-center justify-center bg-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Logo visível em telas pequenas */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-gray-900 py-6 lg:hidden">
          <div className="text-center transform transition-all duration-1000" style={{ animation: mounted ? 'fadeInDown 0.8s ease-out' : 'none' }}>
            <div
              className="w-32 h-20 bg-contain bg-center bg-no-repeat mx-auto mb-4 transform hover:scale-105 transition-transform duration-300"
              style={{
                backgroundImage: 'url(/logo/logo2-Photoroom.png)',
              }}
            />
            <p className="text-sm text-gray-300">
              Sistema de gerenciamento da Iago Veiculos
            </p>
          </div>
        </div>
        
        <div className={`max-w-md w-full space-y-6 sm:space-y-8 relative z-10 mt-40 sm:mt-0 transform transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`} style={{ animation: mounted ? 'fadeInRight 0.8s ease-out 0.3s both' : 'none' }}>

          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Criar Conta
            </h2>
            <p className="text-sm text-gray-600">
              Crie sua conta para acessar o sistema
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 animate-shake transform transition-all duration-300">
                <div className="text-sm text-red-800 font-medium">{error}</div>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="transform transition-all duration-300 hover:scale-[1.01]">
                <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 text-sm border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 transition-all duration-300 hover:border-gray-300 shadow-sm"
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div className="transform transition-all duration-300 hover:scale-[1.01]">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">
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
                  className="appearance-none relative block w-full px-3 py-2 text-sm border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 transition-all duration-300 hover:border-gray-300 shadow-sm"
                  placeholder="seu@email.com"
                />
              </div>
              
              <div className="transform transition-all duration-300 hover:scale-[1.01]">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 text-sm border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 transition-all duration-300 hover:border-gray-300 shadow-sm"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="transform transition-all duration-300 hover:scale-[1.01]">
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 text-sm border-2 border-gray-200 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:z-10 transition-all duration-300 hover:border-gray-300 shadow-sm"
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
                    Criando conta...
                  </span>
                ) : (
                  'Criar conta'
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link
                href="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200 hover:underline"
              >
                Fazer login
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

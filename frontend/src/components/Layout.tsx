'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { 
  FiLayout, 
  FiUsers, 
  FiTruck, 
  FiDollarSign, 
  FiFileText, 
  FiCreditCard,
  FiBarChart2,
  FiSearch,
  FiMap,
  FiTarget,
  FiUserCheck,
  FiGift,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiAlertCircle,
  FiList,
  FiShoppingCart,
  FiCheckCircle,
  FiPackage,
  FiRadio,
  FiSend,
  FiZap
} from 'react-icons/fi'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { checkAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [navLoading, setNavLoading] = useState(false)
  const prevPath = useRef<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved === 'true') setSidebarCollapsed(true)
  }, [])

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebarCollapsed', String(next))
      return next
    })
  }, [])

  // Memoizar array de navegação para evitar recriação (ANTES de qualquer return condicional)
  const navigation = useMemo(() => [
    { name: 'Inicio', href: '/dashboard', icon: FiLayout },
    { name: 'Clientes', href: '/customers', icon: FiUsers },
    { name: 'Aniversários', href: '/birthdays', icon: FiGift },
    { name: 'Funcionários', href: '/users', icon: FiUserCheck },
    { name: 'Veículos', href: '/vehicles', icon: FiTruck },
    { name: 'Localização de veículos', href: '/locations', icon: FiMap },
    { name: 'Veículos à venda', href: '/veiculos-a-venda', icon: FiShoppingCart },
    { name: 'Veículos vendidos', href: '/veiculos-vendidos', icon: FiCheckCircle },
    { name: 'Vendas', href: '/sales', icon: FiDollarSign },
    { name: 'Estoque/Site', href: '/estoque', icon: FiPackage },
    { name: 'Metas', href: '/goals', icon: FiTarget },
    { name: 'Anúncios', href: '/announcements', icon: FiRadio },
    { name: 'Financeiro', href: '/financial', icon: FiCreditCard },
      { name: 'Financiamentos', href: '/financings', icon: FiCreditCard },
      { name: 'Comissões', href: '/commissions', icon: FiList },
    { name: 'Lançamentos', href: '/lancamentos', icon: FiList },
    { name: 'Relatórios', href: '/reports', icon: FiBarChart2 },
    { name: 'Pendências', href: '/pendencias', icon: FiAlertCircle },
    { name: 'Sinal de negócio', href: '/sinal-negocio', icon: FiZap },
    { name: 'Consulta FIPE', href: '/fipe', icon: FiSearch },
    { name: 'Despachantes', href: '/despachantes', icon: FiSend },
  ], [])

  const handleLogout = useCallback(() => {
    logout()
    router.push('/login')
  }, [logout, router])

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // Verificar redirecionamento apenas quando necessário
  useEffect(() => {
    // Garantir que a autenticação seja carregada do estado persistido antes de redirecionar
    const timer = setTimeout(async () => {
      try {
        await checkAuth()
      } catch (e) {
        console.error('Erro em checkAuth:', e)
      } finally {
        setIsChecking(false)
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [checkAuth])

  useEffect(() => {
    if (!isChecking) {
      if (!isAuthenticated && pathname !== '/login' && pathname !== '/register') {
        router.push('/login')
      }
    }
  }, [isAuthenticated, pathname, router, isChecking])

  // Perceived navigation feedback: show small progress bar when pathname changes
  useEffect(() => {
    if (prevPath.current && prevPath.current !== pathname) {
      setNavLoading(true)
      const t = setTimeout(() => setNavLoading(false), 700) // hide after 700ms or when page renders
      return () => clearTimeout(t)
    }
    prevPath.current = pathname
  }, [pathname])

  // Enquanto verificamos a autenticação, mostramos loading
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Return condicional DEPOIS de todos os hooks
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Top nav progress */}
      {navLoading && (
        <div className="fixed left-0 right-0 top-0 h-1 z-50">
          <div className="h-1 bg-primary-600 animate-progress" />
        </div>
      )}

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress {
          animation: progress 0.7s linear infinite;
        }
      `}</style>
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-gray-900 transform transition-all duration-200 ease-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 ${sidebarCollapsed ? 'lg:w-[4.5rem]' : ''}
      `}>
        <div className="flex flex-col h-full">
          {/* Menu items */}
          <nav className="flex-1 px-2 lg:px-2 py-4 space-y-1 overflow-y-auto min-h-0">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={handleSidebarClose}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`
                    flex items-center rounded-lg transition-colors duration-150
                    ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                    ${isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <span className={sidebarCollapsed ? 'text-xl' : 'mr-3 text-xl flex-shrink-0'} aria-hidden>•</span>
                  {!sidebarCollapsed && <span className="text-sm font-medium truncate">{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Botão recolher/expandir (só desktop) */}
          <div className="hidden lg:block px-2 pb-2">
            <button
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              {sidebarCollapsed ? (
                <FiChevronRight className="w-5 h-5" />
              ) : (
                <>
                  <FiChevronLeft className="w-5 h-5" />
                  <span className="text-xs font-medium">Recolher</span>
                </>
              )}
            </button>
          </div>

          {/* User info e logout no final da sidebar */}
          <div className={`border-t border-gray-800 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} mb-2`}>
              <div className="flex-shrink-0">
                <div className={`rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600 ${sidebarCollapsed ? 'w-9 h-9' : 'w-10 h-10'}`}>
                  { (user as any)?.avatar ? (
                    (user as any).avatar.startsWith('data:image') ? (
                      <img src={(user as any).avatar} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{(user as any).avatar}</span>
                    )
                  ) : (
                    <FiUser className={`text-gray-400 ${sidebarCollapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
                  )}
                </div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate capitalize">{user?.role}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <>
                <Link
                  href="/my-account"
                  onClick={handleSidebarClose}
                  className="w-full mb-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <FiUser className="w-4 h-4" />
                  Minha Conta
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Sair
                </button>
              </>
            )}
            {sidebarCollapsed && (
              <div className="flex flex-col gap-1">
                <Link
                  href="/my-account"
                  onClick={handleSidebarClose}
                  title="Minha Conta"
                  className="flex justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiUser className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="flex justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-150"
          onClick={handleSidebarClose}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0 h-screen overflow-hidden">
        {/* Botão menu mobile (só quando sem header) */}
        <button
          onClick={handleSidebarToggle}
          className="lg:hidden fixed top-3 left-3 z-30 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 shadow transition-colors"
          title="Abrir menu"
          aria-label="Abrir menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 min-h-0">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

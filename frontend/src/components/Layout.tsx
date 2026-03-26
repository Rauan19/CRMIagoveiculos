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
  FiShoppingCart,
  FiCheckCircle,
  FiPackage,
  FiRadio,
  FiZap,
  FiPieChart,
  FiPercent,
  FiRefreshCw,
  FiAward,
  FiClipboard,
  FiNavigation,
  FiFileMinus
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
    { name: 'Quitações', href: '/quitacao/admin', icon: FiFileMinus },
    { name: 'Localização de veículos', href: '/locations', icon: FiMap },
    { name: 'Veículos à venda', href: '/veiculos-a-venda', icon: FiShoppingCart },
    { name: 'Veículos vendidos', href: '/veiculos-vendidos', icon: FiCheckCircle },
    { name: 'Vendas', href: '/sales', icon: FiDollarSign },
    { name: 'Estoque/Site', href: '/estoque', icon: FiPackage },
    { name: 'Metas', href: '/goals', icon: FiTarget },
    { name: 'Anúncios', href: '/announcements', icon: FiRadio },
    { name: 'Financeiro', href: '/financial', icon: FiPieChart },
    { name: 'Financiamentos', href: '/financings', icon: FiPercent },
    { name: 'Refinanciamento', href: '/refinanciamento', icon: FiRefreshCw },
    { name: 'Comissões', href: '/commissions', icon: FiAward },
    { name: 'Lançamentos', href: '/lancamentos', icon: FiClipboard },
    { name: 'Relatórios', href: '/reports', icon: FiBarChart2 },
    { name: 'Pendências', href: '/pendencias', icon: FiAlertCircle },
    { name: 'Sinal de negócio', href: '/sinal-negocio', icon: FiZap },
    { name: 'Consulta FIPE', href: '/fipe', icon: FiSearch },
    { name: 'Despachantes', href: '/despachantes', icon: FiNavigation },
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
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
          <div className="h-1 bg-primary-500 animate-progress" />
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
        /* Scroll da lista do menu */
        .sidebar-nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: #4b5563 transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 9999px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      {/* Sidebar: mobile (drawer) + desktop (fixa à esquerda) */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800
        transform transition-[transform,width] duration-200 ease-out
        w-64 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Menu items */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto min-h-0 sidebar-nav-scroll">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={handleSidebarClose}
                  title={item.name}
                  className={`
                    flex items-center gap-3 rounded-lg transition-colors duration-150 px-3 py-2.5
                    ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
                    ${isActive ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 opacity-90" aria-hidden />
                  <span className={`text-sm font-medium truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
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
            <div className={`mb-2 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{user?.role}</p>
            </div>
            <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
              <Link
                href="/my-account"
                onClick={handleSidebarClose}
                className="w-full mb-2 px-4 py-2 text-sm font-medium text-gray-200 bg-gray-800 rounded-lg hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <FiUser className="w-4 h-4" />
                Minha Conta
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm font-medium text-gray-200 bg-gray-800 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
              >
                Sair
              </button>
            </div>
            {sidebarCollapsed && (
              <div className="hidden lg:flex flex-col gap-1">
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

      {/* Main content — margem esquerda no desktop conforme largura da sidebar */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-[margin] duration-200 ease-out ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        }`}
      >
        {/* Botão menu mobile (só quando sem header) */}
        <button
          onClick={handleSidebarToggle}
          className="lg:hidden fixed top-3 left-3 z-30 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 border border-gray-700 shadow-md transition-colors"
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

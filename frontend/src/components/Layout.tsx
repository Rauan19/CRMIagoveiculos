'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useEffect, useState } from 'react'
import { 
  FiLayout, 
  FiUsers, 
  FiTruck, 
  FiDollarSign, 
  FiFileText, 
  FiCreditCard,
  FiBarChart2,
  FiSearch,
  FiTarget,
  FiUserCheck
} from 'react-icons/fi'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Aguardar um pouco para o Zustand restaurar do localStorage
    // O Zustand persist já restaura automaticamente, só precisamos garantir que está sincronizado
    const timer = setTimeout(() => {
      checkAuth()
      setIsChecking(false)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [checkAuth])

  useEffect(() => {
    if (!isChecking && !isAuthenticated && pathname !== '/login' && pathname !== '/register') {
      router.push('/login')
    }
  }, [isAuthenticated, pathname, router, isChecking])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FiLayout },
    { name: 'Clientes', href: '/customers', icon: FiUsers },
    { name: 'Funcionários', href: '/users', icon: FiUserCheck },
    { name: 'Veículos', href: '/vehicles', icon: FiTruck },
    { name: 'Vendas', href: '/sales', icon: FiDollarSign },
    { name: 'Estoque', href: '/estoque', icon: FiTruck },
    { name: 'Metas', href: '/goals', icon: FiTarget },
    { name: 'Anúncios', href: '/announcements', icon: FiFileText },
    { name: 'Financeiro', href: '/financial', icon: FiCreditCard },
    { name: 'Relatórios', href: '/reports', icon: FiBarChart2 },
    { name: 'Consulta FIPE', href: '/fipe', icon: FiSearch },
  ]

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Menu items */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-h-0">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="mr-3 text-xl" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info e logout no final da sidebar */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0 h-screen overflow-hidden">
        {/* Header com logo */}
        <header className="bg-black h-16 flex items-center justify-between px-4 lg:px-6 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-white p-2 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 flex justify-center lg:justify-start">
            <div
              className="w-32 h-10 bg-contain bg-center bg-no-repeat"
              style={{
                backgroundImage: 'url(/logo/logo2-Photoroom.png)',
              }}
            />
          </div>
          <div className="lg:hidden flex items-center text-white">
            <span className="text-sm mr-2">{user?.name}</span>
          </div>
        </header>

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

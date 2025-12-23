'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { FiUsers, FiTruck, FiDollarSign, FiTrendingUp, FiShoppingCart, FiPackage } from 'react-icons/fi'

interface DashboardStats {
  customers: {
    total: number
  }
  vehicles: {
    total: number
    disponivel: number
    reservado: number
    vendido: number
  }
  sales: {
    total: number
    revenue: number
    profit: number
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get('/reports/dashboard')
      setStats(response.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral do seu negócio</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Cards Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {/* Total de Clientes */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Clientes</p>
                      <p className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
                        {stats.customers.total}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Total cadastrado</p>
                    </div>
                    <div className="ml-4 p-3 bg-blue-50 rounded-xl">
                      <FiUsers className="h-7 w-7 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total de Veículos */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Veículos</p>
                      <p className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
                        {stats.vehicles.total}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Total no estoque</p>
                    </div>
                    <div className="ml-4 p-3 bg-green-50 rounded-xl">
                      <FiTruck className="h-7 w-7 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total de Vendas */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Vendas</p>
                      <p className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
                        {stats.sales.total}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">Total realizadas</p>
                    </div>
                    <div className="ml-4 p-3 bg-purple-50 rounded-xl">
                      <FiShoppingCart className="h-7 w-7 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lucro Total */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
                <div className="p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Lucro</p>
                      <p className={`mt-2 text-3xl md:text-4xl font-bold ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {stats.sales.profit?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                      </p>
                      <p className={`mt-1 text-xs ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(stats.sales.profit || 0) >= 0 ? 'Ganho total' : 'Prejuízo total'}
                      </p>
                    </div>
                    <div className={`ml-4 p-3 rounded-xl ${(stats.sales.profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <FiTrendingUp className={`h-7 w-7 ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seções Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Status de Veículos */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <FiPackage className="h-5 w-5 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Status dos Veículos</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {stats.vehicles.disponivel}
                      </div>
                      <div className="text-sm font-medium text-green-700">Disponíveis</div>
                      <div className="mt-2 text-xs text-gray-600">
                        {stats.vehicles.total > 0 
                          ? `${((stats.vehicles.disponivel / stats.vehicles.total) * 100).toFixed(1)}% do total`
                          : '0%'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {stats.vehicles.reservado}
                      </div>
                      <div className="text-sm font-medium text-yellow-700">Reservados</div>
                      <div className="mt-2 text-xs text-gray-600">
                        {stats.vehicles.total > 0 
                          ? `${((stats.vehicles.reservado / stats.vehicles.total) * 100).toFixed(1)}% do total`
                          : '0%'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-3xl font-bold text-gray-600 mb-1">
                        {stats.vehicles.vendido}
                      </div>
                      <div className="text-sm font-medium text-gray-700">Vendidos</div>
                      <div className="mt-2 text-xs text-gray-600">
                        {stats.vehicles.total > 0 
                          ? `${((stats.vehicles.vendido / stats.vehicles.total) * 100).toFixed(1)}% do total`
                          : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receita Total */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <FiDollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Receita</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      R$ {stats.sales.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-gray-600">Receita total de vendas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro Completo */}
            {stats.sales.total > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <FiTrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Resumo Financeiro</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-blue-700 mb-2">Receita Total</p>
                      <p className="text-2xl font-bold text-blue-600">
                        R$ {stats.sales.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg border ${(stats.sales.profit || 0) >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <p className={`text-sm font-medium mb-2 ${(stats.sales.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        Lucro Total
                      </p>
                      <p className={`text-2xl font-bold ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {stats.sales.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-sm font-medium text-purple-700 mb-2">Ticket Médio</p>
                      <p className="text-2xl font-bold text-purple-600">
                        R$ {(stats.sales.revenue / stats.sales.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">por venda</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Não foi possível carregar as estatísticas</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

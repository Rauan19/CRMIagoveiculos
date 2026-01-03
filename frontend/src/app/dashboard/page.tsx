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
      <div className="bg-gray-50 p-4">
        {/* Cabeçalho */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Visão geral do negócio</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Carregando...</p>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Cards Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total de Clientes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Clientes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.customers.total}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiUsers className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Total de Veículos */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Veículos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.vehicles.total}
                    </p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <FiTruck className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Total de Vendas */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Vendas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.sales.total}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <FiShoppingCart className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Lucro Total */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Lucro</p>
                    <p className={`text-lg font-bold ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {stats.sales.profit?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${(stats.sales.profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <FiTrendingUp className={`h-5 w-5 ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Seções Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Status de Veículos */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-green-100 rounded mr-2">
                      <FiPackage className="h-4 w-4 text-green-600" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900">Status dos Veículos</h2>
                  </div>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-green-50 rounded border border-green-100">
                      <div className="text-xl font-bold text-green-600">
                        {stats.vehicles.disponivel}
                      </div>
                      <div className="text-xs font-medium text-green-700 mt-1">Disponíveis</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {stats.vehicles.total > 0 
                          ? `${((stats.vehicles.disponivel / stats.vehicles.total) * 100).toFixed(0)}%`
                          : '0%'}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-100">
                      <div className="text-xl font-bold text-yellow-600">
                        {stats.vehicles.reservado}
                      </div>
                      <div className="text-xs font-medium text-yellow-700 mt-1">Reservados</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {stats.vehicles.total > 0 
                          ? `${((stats.vehicles.reservado / stats.vehicles.total) * 100).toFixed(0)}%`
                          : '0%'}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded border border-gray-100">
                      <div className="text-xl font-bold text-gray-600">
                        {stats.vehicles.vendido}
                      </div>
                      <div className="text-xs font-medium text-gray-700 mt-1">Vendidos</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {stats.vehicles.total > 0 
                          ? `${((stats.vehicles.vendido / stats.vehicles.total) * 100).toFixed(0)}%`
                          : '0%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Receita e Financeiro */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-blue-100 rounded mr-2">
                      <FiDollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900">Financeiro</h2>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Receita Total</p>
                    <p className="text-lg font-bold text-blue-600">
                      R$ {stats.sales.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {stats.sales.total > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Ticket Médio</p>
                      <p className="text-lg font-bold text-purple-600">
                        R$ {(stats.sales.revenue / stats.sales.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-600">Não foi possível carregar as estatísticas</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

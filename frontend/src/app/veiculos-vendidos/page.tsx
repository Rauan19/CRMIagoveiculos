'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Link from 'next/link'
import { FiTruck, FiEye, FiSearch, FiDollarSign } from 'react-icons/fi'
import Toast from '@/components/Toast'

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
}

interface Sale {
  id: number
  date: string
  salePrice?: number
  purchasePrice?: number
  profit?: number
  status: string
  customer: {
    id: number
    name: string
    phone?: string
    cpf?: string
  }
  vehicle: Vehicle
  seller: {
    id: number
    name: string
  }
}

export default function VeiculosVendidosPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    try {
      setLoading(true)
      const res = await api.get('/sales')
      setSales(res.data || [])
    } catch (error: any) {
      console.error('Erro ao carregar veículos vendidos:', error)
      setToast({ message: 'Erro ao carregar vendas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = sales.filter((s) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const vehicleStr = `${s.vehicle?.brand || ''} ${s.vehicle?.model || ''} ${s.vehicle?.year || ''} ${s.vehicle?.plate || ''}`.toLowerCase()
    const customerName = (s.customer?.name || '').toLowerCase()
    return vehicleStr.includes(term) || customerName.includes(term)
  })

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos vendidos</h1>
          <p className="text-gray-600 mt-1">
            Veículos que já saíram do estoque (vendidos)
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por veículo ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Placa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data da venda</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preço venda</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Nenhum veículo vendido encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <span className="font-medium text-gray-900">
                            {s.vehicle?.brand} {s.vehicle?.model} {s.vehicle?.year}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{s.vehicle?.plate || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{s.customer?.name || '-'}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {s.salePrice != null
                            ? `R$ ${Number(s.salePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{s.seller?.name || '-'}</td>
                        <td className="px-4 py-2 flex gap-2">
                          <Link
                            href={`/sales?id=${s.id}`}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            <FiDollarSign className="w-4 h-4" />
                            Ver venda
                          </Link>
                          {s.vehicle?.id && (
                            <Link
                              href={`/vehicles?id=${s.vehicle.id}`}
                              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm font-medium"
                            >
                              <FiTruck className="w-4 h-4" />
                              Veículo
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </Layout>
  )
}

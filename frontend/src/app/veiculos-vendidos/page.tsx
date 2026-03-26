'use client'

import { useMemo, useState, useEffect } from 'react'
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
  const [sellerFilter, setSellerFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)

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

  // sellers options extracted from sales
  const sellers = Array.from(new Map(sales.map(s => [s.seller?.id, s.seller])).values()).filter(Boolean) as { id: number; name: string }[]

  const filteredSales = sales.filter((s) => {
    // search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const vehicleStr = `${s.vehicle?.brand || ''} ${s.vehicle?.model || ''} ${s.vehicle?.year || ''} ${s.vehicle?.plate || ''}`.toLowerCase()
      const customerName = (s.customer?.name || '').toLowerCase()
      if (!vehicleStr.includes(term) && !customerName.includes(term)) return false
    }
    // seller filter
    if (sellerFilter && String(s.seller?.id) !== sellerFilter) return false
    // status filter
    if (statusFilter && s.status !== statusFilter) return false
    // date range
    if (dateFrom) {
      const d = new Date(s.date).setHours(0,0,0,0)
      const from = new Date(dateFrom).setHours(0,0,0,0)
      if (d < from) return false
    }
    if (dateTo) {
      const d = new Date(s.date).setHours(0,0,0,0)
      const to = new Date(dateTo).setHours(0,0,0,0)
      if (d > to) return false
    }
    return true
  })

  useEffect(() => {
    setPage(1)
  }, [searchTerm, sellerFilter, statusFilter, dateFrom, dateTo, pageSize])

  const totalResults = filteredSales.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = totalResults === 0 ? 0 : (safePage - 1) * pageSize
  const endIndexExclusive = Math.min(startIndex + pageSize, totalResults)
  const pageSales = filteredSales.slice(startIndex, endIndexExclusive)

  const pagesToShow = useMemo(() => {
    const total = totalPages
    const current = safePage
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = new Set<number>()
    pages.add(1)
    pages.add(total)
    pages.add(current)
    pages.add(current - 1)
    pages.add(current + 1)
    pages.add(current - 2)
    pages.add(current + 2)
    const arr = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
    const out: Array<number> = []
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      const prev = arr[i - 1]
      if (i > 0 && prev != null && p - prev > 1) out.push(-1) // ellipsis
      out.push(p)
    }
    return out
  }, [safePage, totalPages])

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos vendidos</h1>
          <p className="text-gray-600 mt-1">
            Veículos que já saíram do estoque (vendidos)
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por veículo ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm text-gray-900"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <select value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded-md">
              <option value="">Todos os vendedores</option>
              {sellers.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded-md">
              <option value="">Todos os status</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
              <option value="andamento">Em Andamento</option>
            </select>

            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded-md" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1 text-xs border border-gray-300 rounded-md" />

            <button onClick={() => { setSearchTerm(''); setSellerFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }} className="px-2 py-1 text-xs border rounded-md text-gray-600">Limpar</button>

            <button onClick={() => window.print()} className="ml-2 px-2 py-1 text-xs bg-primary-600 text-white rounded-md">Imprimir</button>
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
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Placa</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-sm">
                        Nenhum veículo vendido encontrado
                      </td>
                    </tr>
                  ) : (
                    pageSales.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5">
                          <span className="font-medium text-gray-900 text-sm">
                            {s.vehicle?.brand} {s.vehicle?.model} {s.vehicle?.year}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-600">{s.vehicle?.plate || '-'}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-600">
                          {s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-900">{s.customer?.name || '-'}</td>
                        <td className="px-3 py-1.5 text-xs font-medium text-gray-900">
                          {s.salePrice != null
                            ? `R$ ${Number(s.salePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-600">{s.seller?.name || '-'}</td>
                        <td className="px-3 py-1.5 flex gap-2">
                          <Link
                            href={`/sales?id=${s.id}`}
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-xs font-medium"
                          >
                            <FiDollarSign className="w-4 h-4" />
                            Ver
                          </Link>
                          {s.vehicle?.id && (
                            <Link
                              href={`/vehicles?id=${s.vehicle.id}`}
                              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-xs font-medium"
                            >
                              <FiTruck className="w-4 h-4" />
                              Veíc.
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

        {!loading && totalResults > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              Mostrando <span className="font-medium text-gray-900">{startIndex + 1}</span>–<span className="font-medium text-gray-900">{endIndexExclusive}</span> de{' '}
              <span className="font-medium text-gray-900">{totalResults}</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                aria-label="Itens por página"
                title="Itens por página"
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={80}>80</option>
                <option value={120}>120</option>
              </select>

              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={safePage <= 1}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
              >
                Primeira
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
              >
                Anterior
              </button>

              <div className="flex items-center gap-1">
                {pagesToShow.map((p, idx) =>
                  p === -1 ? (
                    <span key={`e-${idx}`} className="px-2 text-sm text-gray-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-8 px-2 rounded-md text-sm border ${
                        p === safePage ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-current={p === safePage ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
              >
                Próxima
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
              >
                Última
              </button>
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

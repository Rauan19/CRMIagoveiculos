'use client'

import { useState, useEffect, useMemo } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Link from 'next/link'
import { FiEye, FiSearch } from 'react-icons/fi'
import Toast from '@/components/Toast'

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
  chassi?: string
  renavam?: string
  color?: string
  price?: number
  cost?: number
  status: string
  conditionStatus?: string
  posicao?: number
  precoPromocional?: number
  dataEntrada?: string | null
  anoFabricacao?: number | null
  anoModelo?: number | null
  canalEntrada?: string | null
  marcador1?: string | null
  createdAt?: string
}

const conditionLabels: Record<string, string> = {
  usado: 'Usado',
  novo: 'Novo',
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '-'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function VeiculosAVendaPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)
  const [filterCondicao, setFilterCondicao] = useState<'all' | 'usado' | 'novo'>('all')
  const [filterTipo, setFilterTipo] = useState<'all' | 'proprio' | 'consignado' | 'repasse'>('all')
  const [filterMarcador, setFilterMarcador] = useState<'all' | 'com' | 'sem'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      const [disponiveis, reservados] = await Promise.all([
        api.get('/vehicles', { params: { status: 'disponivel' } }),
        api.get('/vehicles', { params: { status: 'reservado' } }),
      ])
      const all = [...(disponiveis.data || []), ...(reservados.data || [])]
      setVehicles(all)
    } catch (error: any) {
      console.error('Erro ao carregar veículos à venda:', error)
      setToast({ message: 'Erro ao carregar veículos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredVehicles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const normTerm = term.replace(/\s/g, '')

    return vehicles.filter((v) => {
      // Filtro condição (Novo/Usado)
      const cond = (v.conditionStatus || '').toLowerCase()
      if (filterCondicao !== 'all' && cond !== filterCondicao) return false

      // Filtro tipo (Próprio/Consignado/Repasse)
      const canal = (v.canalEntrada || '').toUpperCase()
      const tipo =
        canal === 'REPASSE' ? 'repasse' : canal === 'CONSIGNADO' || canal.includes('CONSIGN') ? 'consignado' : 'proprio'
      if (filterTipo !== 'all' && tipo !== filterTipo) return false

      // Filtro marcador
      const hasMarcador = Boolean(String(v.marcador1 || '').trim())
      if (filterMarcador === 'com' && !hasMarcador) return false
      if (filterMarcador === 'sem' && hasMarcador) return false

      // Busca (texto)
      if (!term) return true

      const fullName = `${v.brand} ${v.model} ${v.year}`.toLowerCase()
      const plate = (v.plate || '').toLowerCase().replace(/\s/g, '')
      const chassi = (v.chassi || '').toLowerCase().replace(/\s/g, '')
      const renavam = (v.renavam || '').toLowerCase().replace(/\s/g, '')
      const cod = String(v.id || '').toLowerCase()

      return (
        fullName.includes(term) ||
        (v.brand || '').toLowerCase().includes(term) ||
        (v.model || '').toLowerCase().includes(term) ||
        plate.includes(normTerm) ||
        chassi.includes(normTerm) ||
        renavam.includes(normTerm) ||
        cod.includes(normTerm)
      )
    })
  }, [vehicles, searchTerm, filterCondicao, filterTipo, filterMarcador])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterCondicao, filterTipo, filterMarcador, pageSize])

  const totalResults = filteredVehicles.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = totalResults === 0 ? 0 : (safePage - 1) * pageSize
  const endIndexExclusive = Math.min(startIndex + pageSize, totalResults)
  const pageVehicles = filteredVehicles.slice(startIndex, endIndexExclusive)

  const pagesToShow = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const s = safePage
    const pages = new Set<number>([1, totalPages, s - 1, s, s + 1])
    const arr = Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)
    return arr
  }, [safePage, totalPages])

  const precoVenda = (v: Vehicle) => {
    if (v.precoPromocional != null && v.precoPromocional > 0) return v.precoPromocional
    return v.price ?? 0
  }

  const margem = (v: Vehicle) => {
    const venda = precoVenda(v)
    const custo = v.cost ?? 0
    if (venda === 0 && custo === 0) return null
    return venda - custo
  }

  const diasEmEstoque = (v: Vehicle) => {
    const referencia = v.dataEntrada || v.createdAt
    if (!referencia) return null
    const diff = new Date().getTime() - new Date(referencia).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const fabMod = (v: Vehicle) => {
    const fab = v.anoFabricacao ?? v.year
    const mod = v.anoModelo ?? v.year
    return `${fab}/${mod}`
  }

  const tipoDisplay = (v: Vehicle) => {
    const canal = (v.canalEntrada || '').toUpperCase()
    if (canal === 'REPASSE') return 'Repasse'
    if (canal === 'CONSIGNADO' || canal.includes('CONSIGN')) return 'Consignado'
    return 'Próprio'
  }

  const totals = useMemo(() => {
    let totalVenda = 0
    let totalCusto = 0
    filteredVehicles.forEach((v) => {
      totalVenda += precoVenda(v)
      totalCusto += v.cost ?? 0
    })
    return {
      venda: totalVenda,
      custo: totalCusto,
      margem: totalVenda - totalCusto,
    }
  }, [filteredVehicles])

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos à venda</h1>
          <p className="text-gray-600 mt-1">
            Veículos em estoque disponíveis para venda (entrada de estoque)
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Procure aqui por: marca, modelo, placa, renavam, código ou chassi"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterCondicao}
              onChange={(e) => setFilterCondicao(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
            >
              <option value="all">Todos</option>
              <option value="usado">Usado</option>
              <option value="novo">Novo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
            >
              <option value="all">Todos</option>
              <option value="proprio">Próprio</option>
              <option value="consignado">Consignado</option>
              <option value="repasse">Repasse</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Marcador</label>
            <select
              value={filterMarcador}
              onChange={(e) => setFilterMarcador(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
            >
              <option value="all">Todos</option>
              <option value="com">Com marcador</option>
              <option value="sem">Sem marcador</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setFilterCondicao('all')
              setFilterTipo('all')
              setFilterMarcador('all')
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 text-gray-700"
          >
            Limpar filtros
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 text-sm text-gray-600 flex items-center justify-between gap-3 flex-wrap">
              <div>
                Exibindo {totalResults === 0 ? 0 : startIndex + 1}-{endIndexExclusive} de {totalResults} resultados.
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
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Primeira
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {pagesToShow.map((p, idx) => {
                    const prev = pagesToShow[idx - 1]
                    const showDots = prev != null && p - prev > 1
                    return (
                      <span key={p} className="inline-flex items-center gap-1">
                        {showDots && <span className="px-2 text-gray-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`px-2.5 py-1.5 border rounded-lg text-sm ${
                            p === safePage ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próxima
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Última
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cod</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Posição</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Modelo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Fab/Mod</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">PL/CH</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Dias em estoque</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">$ Custo</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">$ Venda</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">$ Margem</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">B/L</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Marcador</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pageVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-3 py-8 text-center text-gray-500">
                        Nenhum veículo à venda encontrado
                      </td>
                    </tr>
                  ) : (
                    pageVehicles.map((v, index) => {
                      const margemVal = margem(v)
                      return (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900 font-mono whitespace-nowrap">{v.id}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{v.posicao ?? startIndex + index + 1}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {(v.brand || '').toUpperCase()} {v.model} {v.year}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{fabMod(v)}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{(v.color || '-').toUpperCase()}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 font-mono">
                            {v.plate || v.chassi || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className="text-gray-900">
                              {conditionLabels[v.conditionStatus || ''] || (v.conditionStatus || '-')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{tipoDisplay(v)}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-right">
                            {diasEmEstoque(v) != null ? diasEmEstoque(v) : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {v.cost != null ? formatMoney(v.cost) : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {precoVenda(v) > 0 ? formatMoney(precoVenda(v)) : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            {margemVal != null ? (
                              <span className={margemVal >= 0 ? 'text-green-700' : 'text-red-700'}>
                                {formatMoney(margemVal)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500"></td>
                          <td className="px-3 py-2 text-sm text-gray-600">{v.marcador1 || ''}</td>
                          <td className="px-3 py-2 text-sm">
                            <Link
                              href={`/vehicles?id=${v.id}`}
                              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium"
                            >
                              <FiEye className="w-4 h-4" />
                              Ver
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-sm font-medium text-gray-700 text-right">
                      Totais:
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">
                      {formatMoney(totals.custo)}
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">
                      {formatMoney(totals.venda)}
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-right">
                      <span className={totals.margem >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {formatMoney(totals.margem)}
                      </span>
                    </td>
                    <td colSpan={3} className="px-3 py-2"></td>
                  </tr>
                </tfoot>
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

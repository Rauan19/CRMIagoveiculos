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

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const fullName = `${v.brand} ${v.model} ${v.year}`.toLowerCase()
    const plate = (v.plate || '').toLowerCase().replace(/\s/g, '')
    const chassi = (v.chassi || '').toLowerCase().replace(/\s/g, '')
    return (
      fullName.includes(term) ||
      (v.brand || '').toLowerCase().includes(term) ||
      (v.model || '').toLowerCase().includes(term) ||
      plate.includes(term.replace(/\s/g, '')) ||
      chassi.includes(term.replace(/\s/g, ''))
    )
  })

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
    const entrada = v.dataEntrada
    if (!entrada) return null
    const diff = new Date().getTime() - new Date(entrada).getTime()
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
              placeholder="Buscar por marca, modelo, ano, placa ou chassi..."
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
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">#</th>
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
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-3 py-8 text-center text-gray-500">
                        Nenhum veículo à venda encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v, index) => {
                      const margemVal = margem(v)
                      return (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">{v.posicao ?? index + 1}</td>
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
                    <td colSpan={8} className="px-3 py-2 text-sm font-medium text-gray-700 text-right">
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

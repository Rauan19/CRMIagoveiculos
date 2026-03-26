'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import api from '@/services/api'
import ConfirmModal from '@/components/ConfirmModal'
import Toast from '@/components/Toast'
import { FiEye, FiTrash2, FiSearch, FiChevronRight, FiFileMinus } from 'react-icons/fi'

interface QuitacaoRow {
  id: number
  vehicleId: number
  data: string
  veiculoTexto: string
  situacao: string
  situacaoRaw: string
  valorQuitacao: number
  qtdParcelas: number
  valorParcela: number
  valorPago: number
  primeiroVcto: string
  observacoesInternas: string | null
  vehicle?: {
    id: number
    brand: string
    model: string
    year: number
    color?: string | null
    plate?: string | null
    status?: string
  } | null
}

function formatMoney(n: number) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatData(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function QuitacaoAdminPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [situacao, setSituacao] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [viewItem, setViewItem] = useState<QuitacaoRow | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [allRows, setAllRows] = useState<QuitacaoRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (situacao) params.situacao = situacao
      const res = await api.get('/quitacoes', { params })
      setAllRows(Array.isArray(res.data) ? res.data : [])
    } catch (e: any) {
      console.error(e)
      setToast({ message: e.response?.data?.error || 'Erro ao carregar quitações', type: 'error' })
      setAllRows([])
    } finally {
      setLoading(false)
    }
  }, [situacao])

  useEffect(() => {
    load()
  }, [load])

  const rows = useMemo(() => {
    if (!search.trim()) return allRows
    const q = search.trim().toLowerCase()
    return allRows.filter((r) => {
      const t = `${r.veiculoTexto} ${r.vehicle?.plate || ''}`.toLowerCase()
      return t.includes(q)
    })
  }, [allRows, search])

  useEffect(() => {
    setPage(1)
  }, [search, situacao, rows.length, pageSize])

  const totalResults = rows.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = totalResults === 0 ? 0 : (safePage - 1) * pageSize
  const endIndexExclusive = Math.min(startIndex + pageSize, totalResults)
  const pageRows = rows.slice(startIndex, endIndexExclusive)

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
    const arr = Array.from(pages)
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b)
    const out: Array<number> = []
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      const prev = arr[i - 1]
      if (i > 0 && prev != null && p - prev > 1) out.push(-1)
      out.push(p)
    }
    return out
  }, [safePage, totalPages])

  const handleBuscar = () => {
    load()
  }

  const handleExcluir = async () => {
    if (confirmDeleteId == null) return
    setDeleting(true)
    try {
      await api.delete(`/quitacoes/${confirmDeleteId}`)
      setToast({ message: 'Quitação excluída.', type: 'success' })
      setConfirmDeleteId(null)
      await load()
    } catch (e: any) {
      setToast({ message: e.response?.data?.error || 'Erro ao excluir', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
          <Link href="/dashboard" className="hover:text-primary-600">
            Home
          </Link>
          <FiChevronRight className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
          <span className="text-gray-800 font-medium">Quitação</span>
          <FiChevronRight className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
          <span className="text-primary-600 font-semibold">Controle</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <FiFileMinus className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quitações</h1>
              <p className="text-sm text-gray-600">Controle de parcelas de quitação por veículo</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">Digite o que procura</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                  placeholder="Placa, Cor, Marca, Modelo ..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <label className="block text-xs font-medium text-gray-700 mb-1">Situação</label>
              <select
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas</option>
                <option value="vendido">Vendido</option>
                <option value="disponivel">Disponível</option>
                <option value="reservado">Reservado</option>
                <option value="excluido">Excluído</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleBuscar}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Buscar
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Exibindo{' '}
          {totalResults === 0 ? (
            '0 resultados.'
          ) : (
            <>
              {startIndex + 1}-{endIndexExclusive} de {totalResults} resultados.
            </>
          )}
        </p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-900">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Data</th>
                  <th className="px-3 py-2 text-left font-semibold min-w-[200px]">Veículo</th>
                  <th className="px-3 py-2 text-left font-semibold">Situação</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Valor Quitação</th>
                  <th className="px-3 py-2 text-right font-semibold">Qtd. Parcelas</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Valor Parcela</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Valor Pago</th>
                  <th className="px-3 py-2 text-center font-semibold w-28">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                      Carregando...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                      Nenhuma quitação encontrada.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 odd:bg-white even:bg-gray-50/50 hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatData(r.primeiroVcto)}</td>
                      <td className="px-3 py-2 text-gray-900">{r.veiculoTexto || '—'}</td>
                      <td className="px-3 py-2">{r.situacao}</td>
                      <td className="px-3 py-2 text-right tabular-nums">R$ {formatMoney(r.valorQuitacao)}</td>
                      <td className="px-3 py-2 text-right">{r.qtdParcelas}</td>
                      <td className="px-3 py-2 text-right tabular-nums">R$ {formatMoney(r.valorParcela)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">R$ {formatMoney(r.valorPago)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewItem(r)}
                            className="p-1.5 rounded-md text-primary-600 hover:bg-primary-50"
                            title="Visualizar"
                            aria-label="Visualizar"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                            title="Excluir"
                            aria-label="Excluir"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && totalResults > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-600">
              Página <span className="font-medium text-gray-900">{safePage}</span> de{' '}
              <span className="font-medium text-gray-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                aria-label="Itens por página"
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
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Primeira
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {pagesToShow.map((p, idx) =>
                  p === -1 ? (
                    <span key={`e-${idx}`} className="px-2 text-gray-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 min-w-8 px-2 rounded-md text-sm border ${
                        p === safePage ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 hover:bg-gray-50'
                      }`}
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
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Próxima
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={safePage >= totalPages}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Última
              </button>
            </div>
          </div>
        )}

        {viewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Detalhes da quitação</h2>
                <button
                  type="button"
                  onClick={() => setViewItem(null)}
                  className="text-gray-500 hover:text-gray-800 text-sm font-medium"
                >
                  Fechar
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">Veículo</span>
                  <p className="font-medium text-gray-900">{viewItem.veiculoTexto}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">1º vencimento</span>
                    <p className="font-medium">{formatData(viewItem.primeiroVcto)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Situação</span>
                    <p className="font-medium">{viewItem.situacao}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Valor quitação</span>
                    <p className="font-medium tabular-nums">R$ {formatMoney(viewItem.valorQuitacao)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Parcelas</span>
                    <p className="font-medium">{viewItem.qtdParcelas}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Valor parcela</span>
                    <p className="font-medium tabular-nums">R$ {formatMoney(viewItem.valorParcela)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Valor pago</span>
                    <p className="font-medium tabular-nums">R$ {formatMoney(viewItem.valorPago)}</p>
                  </div>
                </div>
                {viewItem.observacoesInternas ? (
                  <div>
                    <span className="text-gray-500">Observações</span>
                    <p className="text-gray-800 whitespace-pre-wrap">{viewItem.observacoesInternas}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmDeleteId != null}
          title="Excluir quitação"
          message="Tem certeza que deseja excluir este registro de quitação? Esta ação não remove o veículo."
          confirmText={deleting ? 'Excluindo...' : 'Excluir'}
          cancelText="Cancelar"
          onConfirm={handleExcluir}
          onCancel={() => !deleting && setConfirmDeleteId(null)}
        />

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  )
}

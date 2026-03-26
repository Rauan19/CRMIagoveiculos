'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'

type FinancingRow = {
  id: number
  date: string
  type: string
  vehicle: string
  financialCompany: string
  financedValue: number
  returnValue: number
  tac: number
  plus: number
  returnType: string
  position: number
  received: boolean
}

export default function FinancingsPage() {
  const [rows, setRows] = useState<FinancingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const [financeFilter, setFinanceFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [receivedFilter, setReceivedFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)

  useEffect(() => {
    fetchRows()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [rows.length, pageSize])

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
    const arr = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
    const out: Array<number> = []
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      const prev = arr[i - 1]
      if (i > 0 && prev != null && p - prev > 1) out.push(-1)
      out.push(p)
    }
    return out
  }, [safePage, totalPages])

  const fetchRows = async (params: Record<string, any> = {}) => {
    try {
      setLoading(true)
      const res = await api.get('/financings', { params })
      setRows(res.data || [])
    } catch (e) {
      console.error('Erro ao carregar financiamentos:', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    const params: Record<string, any> = {}
    if (companyFilter) params.company = companyFilter
    if (financeFilter) params.finance = financeFilter
    if (typeFilter) params.type = typeFilter
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate
    if (positionFilter) params.position = positionFilter
    if (receivedFilter) params.received = receivedFilter
    fetchRows(params)
  }

  const clearFilters = () => {
    setCompanyFilter('')
    setFinanceFilter('')
    setTypeFilter('')
    setStartDate('')
    setEndDate('')
    setPositionFilter('')
    setReceivedFilter('')
    fetchRows()
  }

  const handlePrint = () => window.print()

  const exportCSV = () => {
    if (!rows || rows.length === 0) return
    const header = ['Data','Tipo','Veículo','Financeira','$Financiado','$Retorno','$Tac','$Plus','Tipo Ret.','Posição','Recebido?']
    const csv = [
      header.join(';'),
      ...rows.map(r => [
        new Date(r.date).toLocaleDateString('pt-BR'),
        r.type,
        r.vehicle,
        r.financialCompany,
        r.financedValue?.toFixed(2) || '0,00',
        r.returnValue?.toFixed(2) || '0,00',
        r.tac?.toFixed(2) || '0,00',
        r.plus?.toFixed(2) || '0,00',
        r.returnType,
        String(r.position || ''),
        r.received ? 'Sim' : 'Não'
      ].join(';'))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financiamentos-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout>
      <div className="bg-gray-50 p-2 lg:p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-black">Financiamentos</h1>
            <p className="text-[11px] text-gray-600 mt-0.5">Lista de financiamentos dos veículos</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrint} className="px-2 py-1 bg-gray-700 text-white rounded text-[11px]">Imprimir</button>
            <button onClick={exportCSV} className="px-2 py-1 bg-primary-600 text-white rounded text-[11px]">Exportar</button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-1.5 rounded shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
            <div>
              <label className="text-[10px] text-gray-600">Empresas</label>
              <input className="w-full px-1.5 py-0.5 border rounded text-xs" placeholder="Busca..." value={companyFilter} onChange={(e)=>setCompanyFilter(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-600">Financeira</label>
              <input className="w-full px-1.5 py-0.5 border rounded text-xs" placeholder="Busca..." value={financeFilter} onChange={(e)=>setFinanceFilter(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-600">Tipos</label>
              <select className="w-full px-1.5 py-0.5 border rounded text-xs" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="financiamento">Financiamento</option>
                <option value="refinanciamento">Refinanciamento</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-600">Recebido</label>
              <select className="w-full px-1.5 py-0.5 border rounded text-xs" value={receivedFilter} onChange={(e)=>setReceivedFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 mt-2">
            <div>
              <label className="text-[10px] text-gray-600">Data De</label>
              <input type="date" className="w-full px-1.5 py-0.5 border rounded text-xs" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-600">Até</label>
              <input type="date" className="w-full px-1.5 py-0.5 border rounded text-xs" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-600">Posição</label>
              <select className="w-full px-1.5 py-0.5 border rounded text-xs" value={positionFilter} onChange={(e)=>setPositionFilter(e.target.value)}>
                <option value="">Todas</option>
                {[...Array(10)].map((_,i)=>(<option key={i} value={i+1}>{i+1}</option>))}
              </select>
            </div>
            <div className="flex items-end gap-1.5">
              <button onClick={applyFilters} className="px-2 py-1 bg-primary-600 text-white rounded text-xs">Aplicar</button>
              <button onClick={clearFilters} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Limpar</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-1.5 rounded shadow-sm border border-gray-200 text-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-gray-900">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-gray-900">Data</th>
                  <th className="px-2 py-1 text-left text-gray-900">Tipo</th>
                  <th className="px-2 py-1 text-left text-gray-900">Veículo</th>
                  <th className="px-2 py-1 text-left text-gray-900">Financeira</th>
                  <th className="px-2 py-1 text-left text-gray-900">Financiado</th>
                  <th className="px-2 py-1 text-left text-gray-900">Retorno</th>
                  <th className="px-2 py-1 text-left text-gray-900">Tac</th>
                  <th className="px-2 py-1 text-left text-gray-900">Plus</th>
                  <th className="px-2 py-1 text-left text-gray-900">Tipo Ret.</th>
                  <th className="px-2 py-1 text-left text-gray-900">Posição</th>
                  <th className="px-2 py-1 text-left text-gray-900">Recebido?</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="p-2 text-center text-gray-900">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} className="p-2 text-center text-gray-900">Nenhum financiamento encontrado</td></tr>
                ) : pageRows.map((r)=>(<tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-2 py-1">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-2 py-1">{r.type}</td>
                  <td className="px-2 py-1">{r.vehicle}</td>
                  <td className="px-2 py-1">{r.financialCompany}</td>
                  <td className="px-2 py-1">R$ {Number(r.financedValue || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-2 py-1">R$ {Number(r.returnValue || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-2 py-1">R$ {Number(r.tac || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-2 py-1">R$ {Number(r.plus || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-2 py-1">{r.returnType}</td>
                  <td className="px-2 py-1">{r.position}</td>
                  <td className="px-2 py-1">{r.received ? 'Sim' : 'Não'}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && totalResults > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 rounded shadow-sm border border-gray-200">
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
      </div>
    </Layout>
  )
}


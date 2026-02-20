 'use client'

import React, { useEffect, useState } from 'react'
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

  useEffect(() => {
    fetchRows()
  }, [])

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
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Financiamentos</h1>
            <p className="text-sm text-gray-600 mt-1">Lista de financiamentos dos veículos</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3 py-2 bg-gray-700 text-white rounded text-sm">Imprimir</button>
            <button onClick={exportCSV} className="px-3 py-2 bg-primary-600 text-white rounded text-sm">Exportar</button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600">Empresas</label>
              <input className="w-full px-2 py-1 border rounded text-sm" placeholder="Busca..." value={companyFilter} onChange={(e)=>setCompanyFilter(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Financeira</label>
              <input className="w-full px-2 py-1 border rounded text-sm" placeholder="Busca..." value={financeFilter} onChange={(e)=>setFinanceFilter(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Tipos</label>
              <select className="w-full px-2 py-1 border rounded text-sm" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="financiamento">Financiamento</option>
                <option value="refinanciamento">Refinanciamento</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Recebido</label>
              <select className="w-full px-2 py-1 border rounded text-sm" value={receivedFilter} onChange={(e)=>setReceivedFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="text-xs text-gray-600">Data De</label>
              <input type="date" className="w-full px-2 py-1 border rounded text-sm" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Até</label>
              <input type="date" className="w-full px-2 py-1 border rounded text-sm" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Posição</label>
              <select className="w-full px-2 py-1 border rounded text-sm" value={positionFilter} onChange={(e)=>setPositionFilter(e.target.value)}>
                <option value="">Todas</option>
                {[...Array(10)].map((_,i)=>(<option key={i} value={i+1}>{i+1}</option>))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={applyFilters} className="px-3 py-2 bg-primary-600 text-white rounded text-sm">Aplicar</button>
              <button onClick={clearFilters} className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm">Limpar</button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-900">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-900">Data</th>
                  <th className="px-3 py-2 text-left text-gray-900">Tipo</th>
                  <th className="px-3 py-2 text-left text-gray-900">Veículo</th>
                  <th className="px-3 py-2 text-left text-gray-900">Financeira</th>
                  <th className="px-3 py-2 text-left text-gray-900">Financiado</th>
                  <th className="px-3 py-2 text-left text-gray-900">Retorno</th>
                  <th className="px-3 py-2 text-left text-gray-900">Tac</th>
                  <th className="px-3 py-2 text-left text-gray-900">Plus</th>
                  <th className="px-3 py-2 text-left text-gray-900">Tipo Ret.</th>
                  <th className="px-3 py-2 text-left text-gray-900">Posição</th>
                  <th className="px-3 py-2 text-left text-gray-900">Recebido?</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="p-4 text-center text-gray-900">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={11} className="p-4 text-center text-gray-900">Nenhum financiamento encontrado</td></tr>
                ) : rows.map((r)=>(<tr key={r.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.vehicle}</td>
                  <td className="px-3 py-2">{r.financialCompany}</td>
                  <td className="px-3 py-2">R$ {Number(r.financedValue || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2">R$ {Number(r.returnValue || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2">R$ {Number(r.tac || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2">R$ {Number(r.plus || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                  <td className="px-3 py-2">{r.returnType}</td>
                  <td className="px-3 py-2">{r.position}</td>
                  <td className="px-3 py-2">{r.received ? 'Sim' : 'Não'}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}


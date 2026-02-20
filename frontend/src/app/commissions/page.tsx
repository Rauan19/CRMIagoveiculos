 'use client'

import React, { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'

type CommissionRow = {
  id?: number
  period: string
  seller: string
  saleCommission: number
  financingCommission: number
}

export default function CommissionsPage() {
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [quickFilter, setQuickFilter] = useState<'current'|'last'|'prev'|null>('current')
  const [period, setPeriod] = useState('') // formatted MM/YYYY
  const [sellers, setSellers] = useState<string[]>([])
  const [sellerFilter, setSellerFilter] = useState('')

  useEffect(() => {
    fetchRows()
    fetchSellers()
  }, [])

  const fetchSellers = async () => {
    try {
      const res = await api.get('/sellers')
      setSellers(res.data || [])
    } catch (e) {
      console.warn('Erro ao carregar vendedores', e)
    }
  }

  const fetchRows = async (params: Record<string, any> = {}) => {
    try {
      setLoading(true)
      const res = await api.get('/commissions', { params })
      setRows(res.data || [])
    } catch (e) {
      console.error('Erro ao carregar comissões:', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    const params: Record<string, any> = {}
    if (quickFilter) params.quick = quickFilter
    if (period) params.period = period
    if (sellerFilter) params.seller = sellerFilter
    fetchRows(params)
  }

  const clearFilters = () => {
    setQuickFilter('current')
    setPeriod('')
    setSellerFilter('')
    fetchRows()
  }

  const handlePrint = () => window.print()
  const handleExportCSV = () => {
    if (!rows || rows.length === 0) return
    const header = ['Data','Vendedor','Comissão venda','Comissão financiamento','Total']
    const csv = [
      header.join(';'),
      ...rows.map(r => [
        r.period,
        r.seller,
        r.saleCommission?.toFixed(2) || '0,00',
        r.financingCommission?.toFixed(2) || '0,00',
        ((r.saleCommission||0)+(r.financingCommission||0)).toFixed(2)
      ].join(';'))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comissoes-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalSale = rows.reduce((s, r) => s + (r.saleCommission || 0), 0)
  const totalFin = rows.reduce((s, r) => s + (r.financingCommission || 0), 0)

  return (
    <Layout>
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Comissões</h1>
            <p className="text-sm text-gray-600 mt-1">Relatório de comissões por vendedor</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3 py-2 bg-gray-700 text-white rounded text-sm">Imprimir</button>
            <button onClick={handleExportCSV} className="px-3 py-2 bg-primary-600 text-white rounded text-sm">Exportar</button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm font-medium">Filtros Rápidos:</span>
            <button onClick={()=>{setQuickFilter('current'); applyFilters()}} className={`px-2 py-1 rounded text-sm ${quickFilter==='current' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Mês atual</button>
            <button onClick={()=>{setQuickFilter('last'); applyFilters()}} className={`px-2 py-1 rounded text-sm ${quickFilter==='last' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Mês passado</button>
            <button onClick={()=>{setQuickFilter('prev'); applyFilters()}} className={`px-2 py-1 rounded text-sm ${quickFilter==='prev' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Mês anterior</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="text-xs text-gray-600">Período (MM/YYYY)</label>
              <input placeholder="02/2026" value={period} onChange={(e)=>setPeriod(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Vendedores</label>
              <select className="w-full px-2 py-1 border rounded text-sm" value={sellerFilter} onChange={(e)=>setSellerFilter(e.target.value)}>
                <option value="">Todos</option>
                {sellers.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div className="col-span-2 flex items-end gap-2 justify-end">
              <button onClick={applyFilters} className="px-3 py-2 bg-primary-600 text-white rounded text-sm">Aplicar</button>
              <button onClick={clearFilters} className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm">Limpar</button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-900">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-900">Data</th>
                  <th className="px-3 py-2 text-left text-gray-900">Vendedor</th>
                  <th className="px-3 py-2 text-left text-gray-900">Comissão venda</th>
                  <th className="px-3 py-2 text-left text-gray-900">Comissão financiamento</th>
                  <th className="px-3 py-2 text-left text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-900">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-900">Nenhuma comissão encontrada</td></tr>
                ) : (
                  <>
                    <tr className="font-medium bg-gray-50">
                      <td className="px-3 py-2">Total:</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2">R$ {totalSale.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      <td className="px-3 py-2">R$ {totalFin.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      <td className="px-3 py-2">R$ {(totalSale+totalFin).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    </tr>
                    {rows.map((r, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-gray-50">
                        <td className="px-3 py-2">{r.period}</td>
                        <td className="px-3 py-2">{r.seller}</td>
                        <td className="px-3 py-2">R$ {Number(r.saleCommission || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-3 py-2">R$ {Number(r.financingCommission || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        <td className="px-3 py-2">R$ {Number((r.saleCommission||0)+(r.financingCommission||0)).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}


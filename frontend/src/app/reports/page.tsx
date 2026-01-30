'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import { jsPDF } from 'jspdf'
import { 
  FiBarChart2, 
  FiTrendingUp, 
  FiDollarSign, 
  FiUsers, 
  FiTruck, 
  FiPackage,
  FiRefreshCw,
  FiFileText,
  FiFilter,
  FiDownload,
  FiX,
  FiChevronDown
} from 'react-icons/fi'

type ReportType =
  | 'sales'
  | 'customers'
  | 'vehicles'
  | 'profitability'
  | 'vehicles-stuck'
  | 'trade-ins'
  | 'seller-performance'
  | 'top-selling-vehicles'
  | 'profitability-analysis'
  | null

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [selectedSummaryKey, setSelectedSummaryKey] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sellers, setSellers] = useState<{ id: number; name: string }[]>([])

  // Filtros
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    sellerId: '',
    brand: '',
    minYear: '',
    maxYear: '',
    minPrice: '',
    maxPrice: '',
    days: '30',
    limit: '10',
    groupBy: 'month'
  })

  const getReportApiPath = (type: ReportType): string => {
    if (!type) return ''
    const pathMap: Record<string, string> = {
      'seller-performance': 'seller-performance',
      'top-selling-vehicles': 'top-selling-vehicles',
      'profitability-analysis': 'profitability-analysis'
    }
    return pathMap[type] || type
  }

  const loadReportData = async () => {
    if (!reportType) {
      setReportData(null)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      const path = getReportApiPath(reportType)

      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.status) params.append('status', filters.status)
      if (filters.sellerId) params.append('sellerId', filters.sellerId)
      if (filters.brand) params.append('brand', filters.brand)
      if (filters.minYear) params.append('minYear', filters.minYear)
      if (filters.maxYear) params.append('maxYear', filters.maxYear)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.days) params.append('days', filters.days)
      if (reportType === 'top-selling-vehicles' && filters.limit) params.append('limit', filters.limit)
      if (reportType === 'profitability-analysis' && filters.groupBy) params.append('groupBy', filters.groupBy)

      const response = await api.get(`/reports/${path}?${params.toString()}`)
      setReportData(response.data)
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao carregar relatório', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!reportType) {
      setToast({ message: 'Selecione um tipo de relatório', type: 'error' })
      return
    }

    await loadReportData()
    setToast({ message: 'Relatório atualizado com sucesso!', type: 'success' })
  }

  useEffect(() => {
    api.get('/users/sellers').then((r) => setSellers(r.data || [])).catch(() => setSellers([]))
  }, [])

  // Carregar dados automaticamente quando o tipo ou filtros mudarem
  useEffect(() => {
    if (!reportType) {
      setReportData(null)
      return () => {}
    }

    const path = getReportApiPath(reportType)
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)
        if (filters.status) params.append('status', filters.status)
        if (filters.sellerId) params.append('sellerId', filters.sellerId)
        if (filters.brand) params.append('brand', filters.brand)
        if (filters.minYear) params.append('minYear', filters.minYear)
        if (filters.maxYear) params.append('maxYear', filters.maxYear)
        if (filters.minPrice) params.append('minPrice', filters.minPrice)
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
        if (filters.days) params.append('days', filters.days)
        if (reportType === 'top-selling-vehicles' && filters.limit) params.append('limit', filters.limit)
        if (reportType === 'profitability-analysis' && filters.groupBy) params.append('groupBy', filters.groupBy)

        const response = await api.get(`/reports/${path}?${params.toString()}`)
        setReportData(response.data)
      } catch (error: any) {
        console.error('Erro ao carregar relatório:', error)
        setToast({ message: error.response?.data?.error || 'Erro ao carregar relatório', type: 'error' })
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [reportType, filters])

  const handleExportPDF = () => {
    if (!reportData || !reportType) {
      setToast({ message: 'Gere um relatório primeiro', type: 'error' })
      return
    }

    try {
      const doc = new jsPDF()
      let y = 20
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20

      // Título
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const title = getReportTitle(reportType || 'sales')
      doc.text(title, pageWidth / 2, y, { align: 'center' })
      y += 15

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, margin, y)
      y += 10

      if (filters.startDate || filters.endDate) {
        doc.text(`Período: ${filters.startDate || 'Início'} até ${filters.endDate || 'Fim'}`, margin, y)
        y += 10
      }

      y += 5
      doc.line(margin, y, pageWidth - margin, y)
      y += 10

      const resumoForPdf = reportData.resumo || reportData.totals || (reportType === 'top-selling-vehicles' ? { total: reportData.total, limit: reportData.limit } : null)
      if (resumoForPdf) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('RESUMO', margin, y)
        y += 10
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        Object.entries(resumoForPdf).forEach(([key, value]: [string, any]) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          const label = formatLabel(key)
          const formattedValue = formatValue(value)
          doc.text(`${label}: ${formattedValue}`, margin + 5, y)
          y += 7
        })
        y += 5
      }

      const dataForPdf = reportData.vendas || reportData.clientes || reportData.veiculos || reportData.detalhes || reportData.tradeIns || reportData.performance || reportData.analysis
      const data = Array.isArray(dataForPdf) ? dataForPdf : []
      if (data.length > 0) {
          if (y > 220) {
            doc.addPage()
            y = 20
          }
          
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.text('DETALHES', margin, y)
          y += 10
          
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          
          data.slice(0, 20).forEach((item: any, index: number) => {
            if (y > 270) {
              doc.addPage()
              y = 20
            }
            
            const itemText = formatReportItem(item, reportType || 'sales')
            const lines = doc.splitTextToSize(`${index + 1}. ${itemText}`, pageWidth - (margin * 2))
            doc.text(lines, margin + 5, y)
            y += lines.length * 4 + 3
          })

          if (data.length > 20) {
            if (y > 270) {
              doc.addPage()
              y = 20
            }
            doc.text(`... e mais ${data.length - 20} itens`, margin + 5, y)
          }
      }

      const fileName = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      setToast({ message: 'PDF exportado com sucesso!', type: 'success' })
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      setToast({ message: 'Erro ao exportar PDF', type: 'error' })
    }
  }

  const handleExportCSV = () => {
    if (!reportData || !reportType) {
      setToast({ message: 'Gere um relatório primeiro', type: 'error' })
      return
    }

    try {
      const dataArray = getDataArray()
      const headers = getTableHeaders(reportType)
      
      // Criar CSV
      let csvContent = '\uFEFF' // BOM para UTF-8
      
      // Adicionar título e informações
      csvContent += `${getReportTitle(reportType)}\n`
      csvContent += `Data de geração: ${new Date().toLocaleDateString('pt-BR')}\n`
      if (filters.startDate || filters.endDate) {
        csvContent += `Período: ${filters.startDate || 'Início'} até ${filters.endDate || 'Fim'}\n`
      }
      csvContent += '\n'
      const resumoForCsv = reportData.resumo || reportData.totals || (reportType === 'top-selling-vehicles' ? { total: reportData.total, limit: reportData.limit } : null)
      if (resumoForCsv) {
        csvContent += 'RESUMO\n'
        Object.entries(resumoForCsv).forEach(([key, value]: [string, any]) => {
          const label = formatLabel(key)
          const formattedValue = formatValue(value)
          csvContent += `${label},${formattedValue}\n`
        })
        csvContent += '\n'
      }
      
      // Adicionar cabeçalhos
      csvContent += headers.join(',') + '\n'
      
      // Adicionar dados
      dataArray.forEach((item: any) => {
        const cells = getTableCells(item, reportType)
        const row = cells.map(cell => {
          // Escapar vírgulas e aspas
          const cellStr = String(cell).replace(/"/g, '""')
          return `"${cellStr}"`
        }).join(',')
        csvContent += row + '\n'
      })
      
      // Criar blob e download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setToast({ message: 'CSV exportado com sucesso!', type: 'success' })
    } catch (error) {
      console.error('Erro ao exportar CSV:', error)
      setToast({ message: 'Erro ao exportar CSV', type: 'error' })
    }
  }

  const handleExportTXT = () => {
    if (!reportData || !reportType) {
      setToast({ message: 'Gere um relatório primeiro', type: 'error' })
      return
    }

    try {
      const dataArray = getDataArray()
      const headers = getTableHeaders(reportType)
      
      // Criar TXT
      let txtContent = ''
      
      // Adicionar título e informações
      txtContent += `${getReportTitle(reportType)}\n`
      txtContent += '='.repeat(50) + '\n'
      txtContent += `Data de geração: ${new Date().toLocaleDateString('pt-BR')}\n`
      if (filters.startDate || filters.endDate) {
        txtContent += `Período: ${filters.startDate || 'Início'} até ${filters.endDate || 'Fim'}\n`
      }
      txtContent += '\n'
      
      // Adicionar resumo se existir
      const resumoForTxt = reportData.resumo || reportData.totals || (reportType === 'top-selling-vehicles' ? { total: reportData.total, limit: reportData.limit } : null)
      if (resumoForTxt) {
        txtContent += 'RESUMO\n'
        txtContent += '-'.repeat(50) + '\n'
        Object.entries(resumoForTxt).forEach(([key, value]: [string, any]) => {
          const label = formatLabel(key)
          const formattedValue = formatValue(value)
          txtContent += `${label}: ${formattedValue}\n`
        })
        txtContent += '\n'
      }
      
      // Adicionar dados
      txtContent += 'DETALHES\n'
      txtContent += '-'.repeat(50) + '\n'
      
      // Cabeçalhos
      txtContent += headers.join(' | ') + '\n'
      txtContent += '-'.repeat(50) + '\n'
      
      // Dados
      dataArray.forEach((item: any) => {
        const cells = getTableCells(item, reportType)
        txtContent += cells.join(' | ') + '\n'
      })
      
      // Criar blob e download
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setToast({ message: 'TXT exportado com sucesso!', type: 'success' })
    } catch (error) {
      console.error('Erro ao exportar TXT:', error)
      setToast({ message: 'Erro ao exportar TXT', type: 'error' })
    }
  }

  const getReportTitle = (type: ReportType): string => {
    const titles: Record<string, string> = {
      'sales': 'RELATÓRIO DE VENDAS',
      'customers': 'RELATÓRIO DE CLIENTES',
      'vehicles': 'RELATÓRIO DE VEÍCULOS',
      'profitability': 'RELATÓRIO DE LUCRATIVIDADE',
      'vehicles-stuck': 'RELATÓRIO DE VEÍCULOS PARADOS',
      'trade-ins': 'RELATÓRIO DE TRADE-INS',
      'seller-performance': 'VENDAS POR VENDEDOR',
      'top-selling-vehicles': 'VEÍCULOS MAIS VENDIDOS',
      'profitability-analysis': 'LUCRATIVIDADE POR PERÍODO'
    }
    return titles[type || ''] || 'RELATÓRIO'
  }

  const formatLabel = (key: string): string => {
    const labels: Record<string, string> = {
      totalVendas: 'Total de Vendas',
      valorTotal: 'Valor Total',
      ticketMedio: 'Ticket Médio',
      totalClientes: 'Total de Clientes',
      totalCompras: 'Total de Compras',
      valorTotalCompras: 'Valor Total de Compras',
      total: 'Total',
      disponivel: 'Disponíveis',
      reservado: 'Reservados',
      vendido: 'Vendidos',
      valorTotalEstoque: 'Valor Total do Estoque',
      valorTotalVenda: 'Valor Total de Venda',
      totalLucro: 'Lucro Total',
      margemMedia: 'Margem Média',
      totalValorFipe: 'Total Valor FIPE',
      totalValorOferecido: 'Total Valor Oferecido',
      diferencaMedia: 'Diferença Média',
      totalVendedores: 'Total de Vendedores',
      totalSales: 'Vendas',
      totalRevenue: 'Receita Total',
      totalProfit: 'Lucro Total',
      averageMargin: 'Margem Média'
    }
    return labels[key] || key
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      if (value > 1000) {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
      return value.toString()
    }
    return String(value)
  }

  const canClickSummaryKey = (key: string, type: ReportType | null): boolean => {
    if (!type) return false
    if (type === 'customers') {
      return ['totalClientes', 'totalCompras'].includes(key)
    }
    if (type === 'sales') {
      return ['totalVendas', 'valorTotal'].includes(key)
    }
    if (type === 'vehicles') {
      return ['total', 'disponivel', 'reservado', 'vendido'].includes(key)
    }
    if (type === 'trade-ins') {
      return ['total'].includes(key)
    }
    return false
  }

  const getFilteredDataByKey = (key: string, reportData: any, type: ReportType | null): any[] => {
    if (!type || !reportData) return []
    
    const data = reportData.vendas || reportData.clientes || reportData.veiculos || reportData.detalhes || reportData.tradeIns || []
    
    if (key.startsWith('status_')) {
      const status = key.replace('status_', '')
      return data.filter((item: any) => item.status === status)
    }
    
    if (type === 'customers') {
      if (key === 'totalClientes') return data
      if (key === 'totalCompras') return data.filter((item: any) => (item.totalCompras || 0) > 0)
    }
    
    if (type === 'sales') {
      if (key === 'totalVendas') return data
      if (key === 'valorTotal') return data
    }
    
    if (type === 'vehicles') {
      if (key === 'total') return data
      if (key === 'disponivel') return data.filter((item: any) => item.status === 'disponivel')
      if (key === 'reservado') return data.filter((item: any) => item.status === 'reservado')
      if (key === 'vendido') return data.filter((item: any) => item.status === 'vendido')
    }
    
    if (type === 'trade-ins') {
      if (key === 'total') return data
    }
    
    return []
  }

  const renderSummaryList = (key: string, reportData: any, type: ReportType | null) => {
    const filteredData = getFilteredDataByKey(key, reportData, type)
    const title = key.startsWith('status_') 
      ? `Lista: ${key.replace('status_', '').charAt(0).toUpperCase() + key.replace('status_', '').slice(1)}`
      : `Lista: ${formatLabel(key)}`

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
            <FiFileText className="text-gray-500 text-xs" />
            {title}
          </h3>
          <button
            onClick={() => setSelectedSummaryKey(null)}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-xs font-medium"
          >
            <FiX /> Fechar
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '35vh' }}>
          {filteredData.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">Nenhum item</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {getTableHeaders(type).map((header) => (
                    <th key={header} className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.slice(0, 100).map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {getTableCells(item, type || 'sales').map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filteredData.length > 100 && (
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">Mostrando 100 de {filteredData.length}</p>
          </div>
        )}
      </div>
    )
  }

  const formatReportItem = (item: any, type: ReportType): string => {
    if (type === 'sales') {
      return `${item.customer?.name || '-'} - ${item.vehicle?.brand} ${item.vehicle?.model} - R$ ${(item.salePrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    if (type === 'customers') {
      return `${item.nome} - ${item.telefone} - ${item.totalCompras} compras`
    }
    if (type === 'vehicles') {
      return `${item.descricao} - ${item.status} - R$ ${(item.valorVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    if (type === 'profitability') {
      return `${item.vehicle} - Lucro: R$ ${(item.lucro || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Margem: ${item.margem}`
    }
    if (type === 'vehicles-stuck') {
      return `${item.descricao} - ${item.diasParado} dias parado`
    }
    if (type === 'trade-ins') {
      return `${item.veiculo} - Cliente: ${item.cliente} - Valor Oferecido: R$ ${(item.valorOferecido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    if (type === 'seller-performance') {
      return `${item.sellerName} - ${item.totalSales} vendas - R$ ${(item.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    if (type === 'top-selling-vehicles') {
      return `${item.description || item.brand + ' ' + item.model} - ${item.totalSold} vendidos`
    }
    if (type === 'profitability-analysis') {
      return `Período ${item.period} - Lucro R$ ${(item.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    return JSON.stringify(item)
  }

  const getDataArray = (): any[] => {
    if (!reportData || !reportType) return []
    const dataMap: Record<string, string> = {
      'sales': 'vendas',
      'customers': 'clientes',
      'vehicles': 'veiculos',
      'profitability': 'detalhes',
      'vehicles-stuck': 'veiculos',
      'trade-ins': 'tradeIns',
      'seller-performance': 'performance',
      'top-selling-vehicles': 'veiculos',
      'profitability-analysis': 'analysis'
    }
    const dataKey = dataMap[reportType]
    if (dataKey && reportData[dataKey] && Array.isArray(reportData[dataKey])) {
      return reportData[dataKey]
    }
    return []
  }

  const renderReportContent = () => {
    if (!reportData || !reportType) return null
    const dataArray = getDataArray()
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        {dataArray.length > 0 ? (
          <>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '35vh' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {getTableHeaders(reportType).map((header) => (
                      <th key={header} className="px-3 py-1.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataArray.slice(0, 100).map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {getTableCells(item, reportType).map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-1.5 whitespace-nowrap text-xs text-gray-900">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dataArray.length > 100 && (
              <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">Mostrando 100 de {dataArray.length}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-gray-500">Nenhum dado para os filtros selecionados.</p>
          </div>
        )}
      </div>
    )
  }

  const getTableHeaders = (type: ReportType): string[] => {
    const headers: Record<string, string[]> = {
      'sales': ['Cliente', 'Veículo', 'Vendedor', 'Valor Venda', 'Data'],
      'customers': ['Nome', 'Telefone', 'Email', 'Status', 'Total Compras', 'Valor Total'],
      'vehicles': ['Veículo', 'Ano', 'Placa', 'Status', 'Valor Venda', 'Valor Compra', 'Cliente'],
      'profitability': ['Veículo', 'Custo', 'Venda', 'Lucro', 'Margem', 'Vendedor'],
      'vehicles-stuck': ['Veículo', 'Custo', 'Preço', 'Dias Parado'],
      'trade-ins': ['Cliente', 'Veículo', 'Valor FIPE', 'Valor Oferecido', 'Diferença', 'Status'],
      'seller-performance': ['Vendedor', 'Vendas', 'Receita', 'Lucro', 'Ticket Médio', 'Lucro Médio'],
      'top-selling-vehicles': ['Veículo', 'Qtd Vendida', 'Receita', 'Lucro', 'Preço Médio'],
      'profitability-analysis': ['Período', 'Vendas', 'Receita', 'Custo', 'Lucro', 'Margem']
    }
    return headers[type || ''] || []
  }

  const getTableCells = (item: any, type: ReportType): (string | number)[] => {
    if (type === 'sales') {
      return [
        item.customer?.name || '-',
        `${item.vehicle?.brand} ${item.vehicle?.model} ${item.vehicle?.year}`,
        item.seller?.name || '-',
        `R$ ${(item.salePrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        new Date(item.date).toLocaleDateString('pt-BR')
      ]
    }
    if (type === 'customers') {
      return [
        item.nome,
        item.telefone,
        item.email || '-',
        item.status,
        item.totalCompras || 0,
        `R$ ${(item.valorTotalCompras || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]
    }
    if (type === 'vehicles') {
      return [
        `${item.marca} ${item.modelo}`,
        item.ano,
        item.placa || '-',
        item.status,
        `R$ ${(item.valorVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.valorCompra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        item.cliente || '-'
      ]
    }
    if (type === 'profitability') {
      return [
        item.vehicle,
        `R$ ${(item.custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.venda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.lucro || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        item.margem,
        item.vendedor
      ]
    }
    if (type === 'vehicles-stuck') {
      return [
        item.descricao,
        `R$ ${(item.custo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `${item.diasParado || 0} dias`
      ]
    }
    if (type === 'trade-ins') {
      return [
        item.cliente,
        item.veiculo,
        `R$ ${(item.valorFipe || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.valorOferecido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.diferenca || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        item.status
      ]
    }
    if (type === 'seller-performance') {
      return [
        item.sellerName || '-',
        item.totalSales || 0,
        `R$ ${(item.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.averageTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.averageProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]
    }
    if (type === 'top-selling-vehicles') {
      return [
        item.description || `${item.brand} ${item.model} ${item.year}`,
        item.totalSold || 0,
        `R$ ${(item.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.averagePrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]
    }
    if (type === 'profitability-analysis') {
      return [
        item.period || '-',
        item.totalSales || 0,
        `R$ ${(item.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.totalCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${(item.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        item.averageMargin || '0%'
      ]
    }
    return []
  }

  const reportTypes = [
    { value: 'sales', label: 'Vendas', icon: FiDollarSign },
    { value: 'seller-performance', label: 'Vendas por vendedor', icon: FiUsers },
    { value: 'customers', label: 'Clientes', icon: FiUsers },
    { value: 'vehicles', label: 'Veículos', icon: FiTruck },
    { value: 'top-selling-vehicles', label: 'Veículos mais vendidos', icon: FiTruck },
    { value: 'profitability', label: 'Lucratividade', icon: FiTrendingUp },
    { value: 'profitability-analysis', label: 'Lucro por período', icon: FiTrendingUp },
    { value: 'vehicles-stuck', label: 'Veículos parados', icon: FiPackage },
    { value: 'trade-ins', label: 'Trade-Ins', icon: FiRefreshCw }
  ]

  return (
    <Layout>
      <div className="space-y-4 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiBarChart2 className="text-gray-500" />
              Relatórios
            </h1>
            <p className="text-gray-500 mt-0.5 text-xs">Escolha o tipo, aplique filtros e exporte</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-bold mb-3 text-gray-900 flex items-center gap-1.5">
            <FiFileText className="text-gray-500 text-xs" />
            Tipo de relatório
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {reportTypes.map((type) => {
              const Icon = type.icon
              const isSelected = reportType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value as ReportType)}
                  className={`p-2.5 border rounded-lg text-center transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 text-gray-900 shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className={`text-base ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                    <span className="font-medium text-xs leading-tight">{type.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {reportType && (
          <div className="bg-white shadow rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <FiFilter className="text-gray-500 text-xs" />
                Filtros
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {/* Para "Vendas por vendedor": Vendedor em primeiro e em destaque */}
              {reportType === 'seller-performance' && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-0.5">Vendedor</label>
                  <select
                    value={filters.sellerId}
                    onChange={(e) => setFilters({ ...filters, sellerId: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-primary-400 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">Selecione o vendedor</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(reportType === 'sales' || reportType === 'profitability' || reportType === 'customers' || reportType === 'trade-ins' || reportType === 'seller-performance' || reportType === 'top-selling-vehicles' || reportType === 'profitability-analysis') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Inicial</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Data Final</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </>
              )}

              {reportType === 'sales' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Vendedor</label>
                  <select
                    value={filters.sellerId}
                    onChange={(e) => setFilters({ ...filters, sellerId: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Todos</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportType === 'top-selling-vehicles' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Limite (top)</label>
                  <select
                    value={filters.limit}
                    onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="5">Top 5</option>
                    <option value="10">Top 10</option>
                    <option value="20">Top 20</option>
                    <option value="50">Top 50</option>
                  </select>
                </div>
              )}

              {reportType === 'profitability-analysis' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Agrupar por</label>
                  <select
                    value={filters.groupBy}
                    onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="day">Dia</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                  </select>
                </div>
              )}

              {(reportType === 'customers' || reportType === 'vehicles' || reportType === 'trade-ins') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Todos</option>
                    {reportType === 'vehicles' && (
                      <>
                        <option value="disponivel">Disponível</option>
                        <option value="reservado">Reservado</option>
                        <option value="vendido">Vendido</option>
                      </>
                    )}
                    {reportType === 'customers' && (
                      <>
                        <option value="novo">Novo</option>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </>
                    )}
                    {reportType === 'trade-ins' && (
                      <>
                        <option value="pendente">Pendente</option>
                        <option value="aceito">Aceito</option>
                        <option value="recusado">Recusado</option>
                        <option value="vendido">Vendido</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {reportType === 'vehicles' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Marca</label>
                    <input
                      type="text"
                      value={filters.brand}
                      onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="Marca"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Ano Mín</label>
                    <input
                      type="number"
                      value={filters.minYear}
                      onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Ano Máx</label>
                    <input
                      type="number"
                      value={filters.maxYear}
                      onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Preço Mín</label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Preço Máx</label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </>
              )}

              {reportType === 'vehicles-stuck' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Dias parado (mín)</label>
                  <input
                    type="number"
                    value={filters.days}
                    onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-3 pt-2 border-t border-gray-200">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5 font-medium"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <>
                    <FiBarChart2 className="text-xs" />
                    Gerar
                  </>
                )}
              </button>
              {reportData && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800 flex items-center gap-1.5 font-medium"
                  >
                    <FiDownload className="text-xs" />
                    Exportar
                    <FiChevronDown className="text-xs" />
                  </button>
                  {showExportMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded shadow-lg border border-gray-200 z-20 py-0.5">
                        <button
                          onClick={() => { handleExportPDF(); setShowExportMenu(false) }}
                          className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
                        >
                          <FiFileText className="text-gray-500 text-xs" />
                          PDF
                        </button>
                        <button
                          onClick={() => { handleExportCSV(); setShowExportMenu(false) }}
                          className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
                        >
                          <FiFileText className="text-gray-500 text-xs" />
                          CSV
                        </button>
                        <button
                          onClick={() => { handleExportTXT(); setShowExportMenu(false) }}
                          className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
                        >
                          <FiFileText className="text-gray-500 text-xs" />
                          TXT
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {reportData && reportType && (reportData.resumo || reportData.totals || (reportType === 'top-selling-vehicles' && (reportData.total != null || reportData.limit != null))) && (
          <div className="bg-white shadow rounded-lg p-3 border border-gray-200 mb-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Resumo</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(reportData.resumo || reportData.totals || (reportType === 'top-selling-vehicles' ? { total: reportData.total, limit: reportData.limit } : {})).map(([key, value]: [string, any]) => (
                <span key={key} className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-800">
                  {formatLabel(key)}: {typeof value === 'number' && value > 1000 ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : String(value)}
                </span>
              ))}
            </div>
          </div>
        )}

        {renderReportContent()}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  )
}


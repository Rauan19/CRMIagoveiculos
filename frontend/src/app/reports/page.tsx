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
  FiX
} from 'react-icons/fi'

type ReportType = 'sales' | 'customers' | 'vehicles' | 'profitability' | 'vehicles-stuck' | 'trade-ins' | null

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [selectedSummaryKey, setSelectedSummaryKey] = useState<string | null>(null)
  
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
    days: '30'
  })

  const loadReportData = async () => {
    if (!reportType) {
      setReportData(null)
      return
    }

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

      const response = await api.get(`/reports/${reportType}?${params.toString()}`)
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

  // Carregar dados automaticamente quando o tipo ou filtros mudarem
  useEffect(() => {
    if (reportType) {
      const timeoutId = setTimeout(() => {
        loadReportData()
      }, 500) // Debounce de 500ms para evitar muitas requisições

      return () => clearTimeout(timeoutId)
    }
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

      // Resumo
      if (reportData.resumo) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('RESUMO', margin, y)
        y += 10
        
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        Object.entries(reportData.resumo).forEach(([key, value]: [string, any]) => {
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

      // Dados detalhados
      if (reportData.vendas || reportData.clientes || reportData.veiculos || reportData.detalhes || reportData.tradeIns) {
        const data = reportData.vendas || reportData.clientes || reportData.veiculos || reportData.detalhes || reportData.tradeIns || []
        
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
      }

      const fileName = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      setToast({ message: 'PDF exportado com sucesso!', type: 'success' })
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      setToast({ message: 'Erro ao exportar PDF', type: 'error' })
    }
  }

  const getReportTitle = (type: ReportType): string => {
    const titles: Record<string, string> = {
      'sales': 'RELATÓRIO DE VENDAS',
      'customers': 'RELATÓRIO DE CLIENTES',
      'vehicles': 'RELATÓRIO DE VEÍCULOS',
      'profitability': 'RELATÓRIO DE LUCRATIVIDADE',
      'vehicles-stuck': 'RELATÓRIO DE VEÍCULOS PARADOS',
      'trade-ins': 'RELATÓRIO DE TRADE-INS'
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
      diferencaMedia: 'Diferença Média'
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
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <FiFileText className="text-gray-600" />
            {title}
          </h3>
          <button
            onClick={() => setSelectedSummaryKey(null)}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm font-medium"
          >
            <FiX /> Fechar
          </button>
        </div>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '40vh' }}>
          {filteredData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum item encontrado
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {getTableHeaders(type).map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.slice(0, 100).map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    {getTableCells(item, type || 'sales').map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Mostrando 100 de {filteredData.length} registros
            </p>
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
    return JSON.stringify(item)
  }

  // Função auxiliar para obter o array de dados baseado no tipo de relatório
  const getDataArray = (): any[] => {
    if (!reportData || !reportType) return []
    
    // Mapeia o tipo de relatório para a chave correta no objeto reportData
    const dataMap: Record<string, string> = {
      'sales': 'vendas',
      'customers': 'clientes',
      'vehicles': 'veiculos',
      'profitability': 'detalhes',
      'vehicles-stuck': 'veiculos', // vehicles-stuck também retorna 'veiculos'
      'trade-ins': 'tradeIns'
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
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        {dataArray.length > 0 ? (
          <>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '40vh' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {getTableHeaders(reportType).map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataArray.slice(0, 100).map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                      {getTableCells(item, reportType).map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dataArray.length > 100 && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Mostrando 100 de {dataArray.length} registros
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500 text-center">
              Nenhum dado encontrado para os filtros selecionados.
            </p>
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
      'trade-ins': ['Cliente', 'Veículo', 'Valor FIPE', 'Valor Oferecido', 'Diferença', 'Status']
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
    return []
  }

  return (
    <Layout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiBarChart2 className="text-gray-600" />
              Relatórios
            </h1>
            <p className="text-gray-600 mt-1 text-sm">Gerencie e visualize relatórios completos do seu negócio</p>
          </div>
        </div>

        {/* Seleção de Tipo de Relatório */}
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-bold mb-4 text-gray-900 flex items-center gap-2">
            <FiFileText className="text-gray-600" />
            Selecione o Tipo de Relatório
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { value: 'sales', label: 'Vendas', icon: FiDollarSign },
              { value: 'customers', label: 'Clientes', icon: FiUsers },
              { value: 'vehicles', label: 'Veículos', icon: FiTruck },
              { value: 'profitability', label: 'Lucratividade', icon: FiTrendingUp },
              { value: 'vehicles-stuck', label: 'Veículos Parados', icon: FiPackage },
              { value: 'trade-ins', label: 'Trade-Ins', icon: FiRefreshCw }
            ].map((type) => {
              const Icon = type.icon
              const isSelected = reportType === type.value
              return (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value as ReportType)}
                  className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 text-gray-900 shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`text-xl ${isSelected ? 'text-primary-600' : 'text-gray-600'}`} />
                    <span className="font-semibold text-sm">{type.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtros */}
        {reportType && (
          <div className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiFilter className="text-gray-600 text-sm" />
                Filtros
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(reportType === 'sales' || reportType === 'profitability' || reportType === 'customers' || reportType === 'trade-ins') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Data Inicial</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Data Final</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </>
              )}

              {(reportType === 'customers' || reportType === 'vehicles' || reportType === 'trade-ins') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Marca</label>
                    <input
                      type="text"
                      value={filters.brand}
                      onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="Filtrar por marca"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ano Mínimo</label>
                    <input
                      type="number"
                      value={filters.minYear}
                      onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ano Máximo</label>
                    <input
                      type="number"
                      value={filters.maxYear}
                      onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Preço Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Preço Máximo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </>
              )}

              {reportType === 'vehicles-stuck' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Dias Parado (mínimo)</label>
                  <input
                    type="number"
                    value={filters.days}
                    onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
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
                    <FiBarChart2 className="text-sm" />
                    Gerar Relatório
                  </>
                )}
              </button>
              {reportData && (
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
                >
                  <FiDownload className="text-sm" />
                  Exportar PDF
                </button>
              )}
            </div>
          </div>
        )}

        {/* Resultados */}
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


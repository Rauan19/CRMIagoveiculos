'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import CustomerFormModal, { type CustomerFormModalCustomer } from '@/components/CustomerFormModal'
import VehicleFormModal from '@/components/VehicleFormModal'
import { formatCPF, formatCNPJ } from '@/utils/formatters'
import { FiZap, FiPlus, FiEdit2, FiTrash2, FiFilter, FiX, FiUserPlus, FiEye, FiSearch, FiPrinter, FiDownload } from 'react-icons/fi'

interface Customer {
  id: number
  name: string
  phone: string
  email?: string
  cpf?: string
}

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
  status: string
  price?: number
}

interface Seller {
  id: number
  name: string
  email?: string
}

interface SinalNegocio {
  id: number
  customerId: number
  vehicleId?: number | null
  sellerId: number
  valor: number
  data: string
  dataValidade?: string | null
  valorVeiculo?: number | null
  valorEmAberto?: number | null
  formaPagamento?: string | null
  status: string
  observacoes?: string | null
  customer?: Customer
  vehicle?: Vehicle | null
  seller?: Seller
}

const FORMAS_PAGAMENTO = [
  'Boleto Bancário',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Cheque',
  'Débito em Conta',
  'Depósito Bancário',
  'Dinheiro',
  'Duplicata',
  'Financiamento Próprio',
  'Nota Promissória',
  'TED/DOC ou PIX',
  'Transferência',
]

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'convertido', label: 'Convertido' },
  { value: 'desistido', label: 'Desistido' },
  { value: 'devolvido', label: 'Devolvido' },
]

const statusColors: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-800',
  convertido: 'bg-green-100 text-green-800',
  desistido: 'bg-red-100 text-red-800',
  devolvido: 'bg-gray-100 text-gray-800',
}

function parseNum(v: string): number {
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function formatBrl(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SinalNegocioPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sinais, setSinais] = useState<SinalNegocio[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SinalNegocio | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [filterSellerId, setFilterSellerId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDataDe, setFilterDataDe] = useState('')
  const [filterDataAte, setFilterDataAte] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdown, setClientDropdown] = useState(false)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleDropdown, setVehicleDropdown] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedSinal, setSelectedSinal] = useState<SinalNegocio | null>(null)
  const clientSearchRef = useRef<HTMLDivElement>(null)
  const vehicleSearchRef = useRef<HTMLDivElement>(null)

  const formatDoc = (doc: string | undefined) => {
    if (!doc) return '-'
    const digits = doc.replace(/\D/g, '')
    if (digits.length === 11) return formatCPF(doc)
    if (digits.length === 14) return formatCNPJ(doc)
    return doc
  }

  const [formData, setFormData] = useState({
    vehicleId: '',
    customerId: '',
    sellerId: '',
    valor: '0,00',
    dataValidade: '',
    valorVeiculo: '0,00',
    valorEmAberto: '0,00',
    formaPagamento: '',
    status: 'pendente',
    observacoes: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSellerId) params.append('sellerId', filterSellerId)
      if (filterStatus) params.append('status', filterStatus)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      const [sinaisRes, customersRes, vehiclesRes, sellersRes] = await Promise.all([
        api.get(`/sinal-negocio?${params.toString()}`),
        api.get('/customers'),
        api.get('/vehicles?status=disponivel'),
        api.get('/users/sellers'),
      ])
      setSinais(sinaisRes.data || [])
      setCustomers(customersRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setSellers(sellersRes.data || [])
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Erro ao carregar dados', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterSellerId, filterStatus, searchQuery])

  const filteredSinais = (() => {
    if (!filterDataDe && !filterDataAte) return sinais
    return sinais.filter((s) => {
      const dataCriacao = s.data ? s.data.split('T')[0] : ''
      if (filterDataDe && dataCriacao < filterDataDe) return false
      if (filterDataAte && dataCriacao > filterDataAte) return false
      return true
    })
  })()

  useEffect(() => {
    if (!searchParams) return
    const newCustomerId = searchParams.get('newCustomerId')
    const newVehicleId = searchParams.get('newVehicleId')
    const openModal = searchParams.get('openModal')
    if (openModal !== 'sinal' || (!newCustomerId && !newVehicleId)) return
    const run = async () => {
      const params = new URLSearchParams()
      if (filterSellerId) params.append('sellerId', filterSellerId)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      const [sinaisRes, customersRes, vehiclesRes, sellersRes] = await Promise.all([
        api.get(`/sinal-negocio?${params.toString()}`),
        api.get('/customers'),
        api.get('/vehicles?status=disponivel'),
        api.get('/users/sellers'),
      ])
      setSinais(sinaisRes.data || [])
      setCustomers(customersRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setSellers(sellersRes.data || [])
      setLoading(false)
      if (newCustomerId) {
        const newC = (customersRes.data || []).find((c: Customer) => c.id === parseInt(newCustomerId))
        if (newC) {
          setFormData((prev) => ({ ...prev, customerId: newCustomerId }))
          setClientSearch(newC.name)
        }
      }
      if (newVehicleId) {
        setFormData((prev) => ({ ...prev, vehicleId: newVehicleId }))
        const newV = (vehiclesRes.data || []).find((v: Vehicle) => v.id === parseInt(newVehicleId))
        if (newV) setVehicleSearch(`${newV.brand} ${newV.model} ${newV.year}${newV.plate ? ` – ${newV.plate}` : ''}`)
      }
      setShowModal(true)
      router.replace('/sinal-negocio')
    }
    run()
  }, [searchParams])

  const filteredClients = clientSearch.length >= 3
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.phone && c.phone.includes(clientSearch)) ||
          (c.email && c.email.toLowerCase().includes(clientSearch))
      )
    : []

  const vehicleLabel = (v: Vehicle) => `${v.brand} ${v.model} ${v.year}${v.plate ? ` – ${v.plate}` : ''}`
  const filteredVehicles = vehicleSearch.length >= 2
    ? vehicles.filter(
        (v) =>
          vehicleLabel(v).toLowerCase().includes(vehicleSearch.toLowerCase()) ||
          (v.plate && v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()))
      )
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setClientDropdown(false)
      }
      if (vehicleSearchRef.current && !vehicleSearchRef.current.contains(e.target as Node)) {
        setVehicleDropdown(false)
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedCustomer = formData.customerId
    ? customers.find((c) => c.id === parseInt(formData.customerId))
    : null
  const selectedVehicle = formData.vehicleId
    ? vehicles.find((v) => v.id === parseInt(formData.vehicleId))
    : null

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      customerId: '',
      sellerId: '',
      valor: '0,00',
      dataValidade: '',
      valorVeiculo: '0,00',
      valorEmAberto: '0,00',
      formaPagamento: '',
      status: 'pendente',
      observacoes: '',
    })
    setClientSearch('')
    setVehicleSearch('')
    setEditing(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vehicleId || !formData.customerId || !formData.sellerId || !formData.dataValidade) {
      setToast({ message: 'Veículo, Cliente, Vendedor e Data Validade são obrigatórios', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        vehicleId: parseInt(formData.vehicleId),
        customerId: parseInt(formData.customerId),
        sellerId: parseInt(formData.sellerId),
        valor: parseNum(formData.valor),
        dataValidade: formData.dataValidade,
        valorVeiculo: parseNum(formData.valorVeiculo),
        valorEmAberto: parseNum(formData.valorEmAberto),
        formaPagamento: formData.formaPagamento || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
      }
      if (editing) {
        await api.put(`/sinal-negocio/${editing.id}`, payload)
        setToast({ message: 'Sinal atualizado com sucesso!', type: 'success' })
      } else {
        await api.post('/sinal-negocio', payload)
        setToast({ message: 'Sinal cadastrado com sucesso!', type: 'success' })
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Erro ao salvar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (s: SinalNegocio) => {
    setEditing(s)
    setFormData({
      vehicleId: s.vehicleId ? String(s.vehicleId) : '',
      customerId: String(s.customerId),
      sellerId: String(s.sellerId),
      valor: formatBrl(s.valor),
      dataValidade: s.dataValidade ? s.dataValidade.split('T')[0] : '',
      valorVeiculo: s.valorVeiculo != null ? formatBrl(s.valorVeiculo) : '0,00',
      valorEmAberto: s.valorEmAberto != null ? formatBrl(s.valorEmAberto) : '0,00',
      formaPagamento: s.formaPagamento || '',
      status: s.status,
      observacoes: s.observacoes || '',
    })
    setClientSearch(s.customer?.name || '')
    setVehicleSearch(s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model} ${s.vehicle.year}${s.vehicle.plate ? ` – ${s.vehicle.plate}` : ''}` : '')
    setShowModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    setShowConfirmModal(false)
    try {
      await api.delete(`/sinal-negocio/${confirmDeleteId}`)
      setToast({ message: 'Sinal excluído com sucesso!', type: 'success' })
      loadData()
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Erro ao excluir', type: 'error' })
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const formatMoney = (v: number) => `R$ ${formatBrl(v)}`
  const formatDate = (d: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-')

  const handlePrint = () => {
    try {
      window.print()
    } catch {
      setToast({ message: 'Erro ao enviar para impressão.', type: 'error' })
    }
  }

  const buildPrintHtml = (lista: SinalNegocio[]) => {
    const headers = ['Data criação', 'Data validade', 'Veículo', 'Valor sinal', 'Valor veíc.', 'Em aberto', 'Cliente', 'CPF', 'Vendedor', 'Status']
    const rows = lista.map((s) => [
      formatDate(s.data),
      s.dataValidade ? formatDate(s.dataValidade) : '-',
      s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model} ${s.vehicle.year}` : '-',
      formatMoney(s.valor),
      s.valorVeiculo != null ? formatMoney(s.valorVeiculo) : '-',
      s.valorEmAberto != null ? formatMoney(s.valorEmAberto) : '-',
      s.customer?.name ?? '-',
      formatDoc(s.customer?.cpf),
      s.seller?.name ?? '-',
      statusOptions.find((o) => o.value === s.status)?.label ?? s.status,
    ])
    const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
    const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Sinais de negócio - ${new Date().toLocaleDateString('pt-BR')}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 16px; color: #111827; }
            h1 { font-size: 18px; margin-bottom: 8px; }
            p { font-size: 12px; color: #4b5563; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e5e7eb; padding: 4px 6px; text-align: left; }
            th { background: #f3f4f6; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>Sinais de negócio</h1>
          <p>Exportado em ${new Date().toLocaleString('pt-BR')} – ${lista.length} registro(s)</p>
          <table>
            <thead>${thead}</thead>
            <tbody>${tbody}</tbody>
          </table>
        </body>
      </html>
    `
  }

  const handleExportPdf = () => {
    try {
      if (!filteredSinais.length) {
        setToast({ message: 'Não há sinais para exportar.', type: 'info' })
        return
      }
      const win = window.open('', '_blank')
      if (!win) {
        setToast({ message: 'Não foi possível abrir a janela para exportar.', type: 'error' })
        return
      }
      win.document.open()
      win.document.write(buildPrintHtml(filteredSinais))
      win.document.close()
      win.focus()
      win.print()
      setShowExportMenu(false)
    } catch {
      setToast({ message: 'Erro ao exportar PDF.', type: 'error' })
    }
  }

  const handleExportCsv = () => {
    try {
      if (!filteredSinais.length) {
        setToast({ message: 'Não há sinais para exportar.', type: 'info' })
        return
      }
      const headers = ['Data criação', 'Data validade', 'Veículo', 'Valor sinal', 'Valor veíc.', 'Em aberto', 'Cliente', 'CPF', 'Vendedor', 'Status']
      const rows = filteredSinais.map((s) => [
        formatDate(s.data),
        s.dataValidade ? formatDate(s.dataValidade) : '',
        s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model} ${s.vehicle.year}` : '',
        formatBrl(s.valor),
        s.valorVeiculo != null ? formatBrl(s.valorVeiculo) : '',
        s.valorEmAberto != null ? formatBrl(s.valorEmAberto) : '',
        s.customer?.name ?? '',
        (s.customer?.cpf || '').replace(/\D/g, ''),
        s.seller?.name ?? '',
        statusOptions.find((o) => o.value === s.status)?.label ?? s.status,
      ])
      const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
      const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map((x) => escape(String(x))).join(','))].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sinais-negocio-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
      setToast({ message: 'CSV exportado com sucesso.', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao exportar CSV.', type: 'error' })
    }
  }

  const handleExportExcel = () => {
    try {
      if (!filteredSinais.length) {
        setToast({ message: 'Não há sinais para exportar.', type: 'info' })
        return
      }
      const headers = ['Data criação', 'Data validade', 'Veículo', 'Valor sinal', 'Valor veíc.', 'Em aberto', 'Cliente', 'CPF', 'Vendedor', 'Status']
      const rows = filteredSinais.map((s) => [
        formatDate(s.data),
        s.dataValidade ? formatDate(s.dataValidade) : '',
        s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model} ${s.vehicle.year}` : '',
        formatBrl(s.valor),
        s.valorVeiculo != null ? formatBrl(s.valorVeiculo) : '',
        s.valorEmAberto != null ? formatBrl(s.valorEmAberto) : '',
        s.customer?.name ?? '',
        (s.customer?.cpf || '').replace(/\D/g, ''),
        s.seller?.name ?? '',
        statusOptions.find((o) => o.value === s.status)?.label ?? s.status,
      ])
      const escape = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
      const csv = [headers.map(escape).join(';'), ...rows.map((r) => r.map((x) => escape(String(x))).join(';'))].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sinais-negocio-${new Date().toISOString().split('T')[0]}.xls`
      a.click()
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
      setToast({ message: 'Planilha exportada com sucesso.', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao exportar planilha.', type: 'error' })
    }
  }

  const defaultDataValidade = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }

  return (
    <Layout>
      <div className="space-y-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiZap className="text-primary-600" />
              Sinal de negócio
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Registro de sinais (entrada/reserva) de clientes</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium border border-gray-300"
            >
              <FiPrinter className="w-4 h-4" />
              Imprimir
            </button>
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-600 rounded-lg hover:bg-primary-100 text-sm font-medium"
              >
                <FiDownload className="w-4 h-4" />
                Exportar
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                  <button type="button" onClick={handleExportPdf} className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100">
                    PDF
                  </button>
                  <button type="button" onClick={handleExportCsv} className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100">
                    CSV
                  </button>
                  <button type="button" onClick={handleExportExcel} className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100">
                    Excel
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                resetForm()
                setFormData((prev) => ({
                  ...prev,
                  dataValidade: prev.dataValidade || defaultDataValidade(),
                }))
                setShowModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              <FiPlus className="w-4 h-4" />
              Novo sinal
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setSearchQuery(searchTerm))}
                placeholder="Cliente, veículo, CPF, vendedor..."
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              />
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery(searchTerm)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
            >
              Buscar
            </button>
            <FiFilter className="text-gray-500 text-sm shrink-0 hidden sm:block" />
            <select
              value={filterSellerId}
              onChange={(e) => setFilterSellerId(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 min-w-[140px]"
            >
              <option value="">Vendedor: Todos</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 min-w-[120px]"
            >
              <option value="">Status: Todos</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filterDataDe}
                onChange={(e) => setFilterDataDe(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 w-[130px]"
                title="Data criação de"
              />
              <span className="text-gray-400 text-xs">até</span>
              <input
                type="date"
                value={filterDataAte}
                onChange={(e) => setFilterDataAte(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900 w-[130px]"
                title="Data criação até"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Data criação</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Data validade</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Veículo</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Valor sinal</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Valor veíc.</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Em aberto</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">CPF</th>
                    <th className="px-1.5 py-1 text-left font-semibold text-gray-600 uppercase whitespace-nowrap">Vendedor</th>
                    <th className="px-1.5 py-1 text-right font-semibold text-gray-600 uppercase whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSinais.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-1.5 py-6 text-center text-gray-500">
                        Nenhum sinal cadastrado.
                      </td>
                    </tr>
                  ) : (
                    filteredSinais.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-1.5 py-1 text-gray-700 whitespace-nowrap">{formatDate(s.data)}</td>
                        <td className="px-1.5 py-1 text-gray-700 whitespace-nowrap">{s.dataValidade ? formatDate(s.dataValidade) : '-'}</td>
                        <td className="px-1.5 py-1 text-gray-700 max-w-[120px] truncate" title={s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model} ${s.vehicle.year}` : ''}>
                          {s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model} ${s.vehicle.year}` : '-'}
                        </td>
                        <td className="px-1.5 py-1 font-medium text-gray-900 whitespace-nowrap">{formatMoney(s.valor)}</td>
                        <td className="px-1.5 py-1 text-gray-700 whitespace-nowrap">{s.valorVeiculo != null ? formatMoney(s.valorVeiculo) : '-'}</td>
                        <td className="px-1.5 py-1 text-gray-700 whitespace-nowrap">{s.valorEmAberto != null ? formatMoney(s.valorEmAberto) : '-'}</td>
                        <td className="px-1.5 py-1 text-gray-900 max-w-[100px] truncate" title={s.customer?.name ?? ''}>{s.customer?.name ?? '-'}</td>
                        <td className="px-1.5 py-1 text-gray-700 whitespace-nowrap">{formatDoc(s.customer?.cpf)}</td>
                        <td className="px-1.5 py-1 text-gray-700 max-w-[90px] truncate" title={s.seller?.name ?? ''}>{s.seller?.name ?? '-'}</td>
                        <td className="px-1.5 py-1 text-right">
                          <div className="flex justify-end gap-0.5">
                            <button
                              onClick={() => { setSelectedSinal(s); setShowDetailsModal(true) }}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                              title="Ver detalhes"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleEdit(s)}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                              title="Editar"
                            >
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { setConfirmDeleteId(s.id); setShowConfirmModal(true) }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Excluir"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Sinal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowModal(false); resetForm() }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editing ? 'Editar sinal' : 'Criar sinal'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div ref={vehicleSearchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veículo *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => {
                        setVehicleSearch(e.target.value)
                        setVehicleDropdown(true)
                        if (!e.target.value) setFormData((p) => ({ ...p, vehicleId: '' }))
                      }}
                      onFocus={() => vehicleSearch.length >= 2 && setVehicleDropdown(true)}
                      placeholder="Digite ao menos 2 caracteres para buscar (marca, modelo, placa)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVehicleModal(true)}
                      className="px-3 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium whitespace-nowrap flex items-center gap-1"
                    >
                      <FiPlus className="w-4 h-4" />
                      Criar novo veículo
                    </button>
                  </div>
                  {vehicleSearch.length > 0 && vehicleSearch.length < 2 && (
                    <p className="text-xs text-gray-500 mt-1">Digite ao menos 2 caracteres para buscar o veículo.</p>
                  )}
                  {selectedVehicle && (
                    <p className="text-xs text-green-600 mt-1">Veículo selecionado: {vehicleLabel(selectedVehicle)}</p>
                  )}
                  {vehicleDropdown && vehicleSearch.length >= 2 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-gray-900">
                      {filteredVehicles.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-500">Nenhum veículo encontrado</li>
                      ) : (
                        filteredVehicles.slice(0, 10).map((v) => (
                          <li
                            key={v.id}
                            className="px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0"
                            onClick={() => {
                              setFormData((p) => ({ ...p, vehicleId: String(v.id) }))
                              setVehicleSearch(vehicleLabel(v))
                              setVehicleDropdown(false)
                            }}
                          >
                            {vehicleLabel(v)}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                <div ref={clientSearchRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value)
                        setClientDropdown(true)
                        if (!e.target.value) setFormData((p) => ({ ...p, customerId: '' }))
                      }}
                      onFocus={() => clientSearch.length >= 3 && setClientDropdown(true)}
                      placeholder="Digite no mínimo 3 caracteres para localizar o cliente"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="px-3 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium whitespace-nowrap flex items-center gap-1"
                    >
                      <FiUserPlus className="w-4 h-4" />
                      Criar novo
                    </button>
                  </div>
                  {clientSearch.length > 0 && clientSearch.length < 3 && (
                    <p className="text-xs text-gray-500 mt-1">Digite no mínimo 3 caracteres para localizar o cliente.</p>
                  )}
                  {selectedCustomer && (
                    <p className="text-xs text-green-600 mt-1">Cliente selecionado: {selectedCustomer.name}</p>
                  )}
                  {clientDropdown && clientSearch.length >= 3 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-gray-900">
                      {filteredClients.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-gray-500">Nenhum cliente encontrado</li>
                      ) : (
                        filteredClients.slice(0, 10).map((c) => (
                          <li
                            key={c.id}
                            className="px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-0"
                            onClick={() => {
                              setFormData((p) => ({ ...p, customerId: String(c.id) }))
                              setClientSearch(c.name)
                              setClientDropdown(false)
                            }}
                          >
                            {c.name} {c.phone && `– ${c.phone}`}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
                  <select
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                  <input
                    type="text"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0,00"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Validade *</label>
                  <input
                    type="date"
                    value={formData.dataValidade}
                    onChange={(e) => setFormData({ ...formData, dataValidade: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Veículo *</label>
                  <input
                    type="text"
                    value={formData.valorVeiculo}
                    onChange={(e) => setFormData({ ...formData, valorVeiculo: e.target.value })}
                    placeholder="0,00"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Em Aberto *</label>
                  <input
                    type="text"
                    value={formData.valorEmAberto}
                    onChange={(e) => setFormData({ ...formData, valorEmAberto: e.target.value })}
                    placeholder="0,00"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={formData.formaPagamento}
                    onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    {FORMAS_PAGAMENTO.map((fp) => (
                      <option key={fp} value={fp}>{fp}</option>
                    ))}
                  </select>
                </div>

                {editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      {statusOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      <CustomerFormModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={(customer: CustomerFormModalCustomer) => {
          setCustomers((prev) => {
            const exists = prev.some((c) => c.id === customer.id)
            if (exists) return prev.map((c) => (c.id === customer.id ? { ...c, ...customer } : c))
            return [...prev, { id: customer.id, name: customer.name, phone: customer.phone || '', email: customer.email }]
          })
          setFormData((prev) => ({ ...prev, customerId: String(customer.id) }))
          setClientSearch(customer.name)
          setShowCustomerModal(false)
        }}
      />

      <VehicleFormModal
        open={showVehicleModal}
        onClose={() => setShowVehicleModal(false)}
        onSuccess={(vehicle) => {
          setVehicles((prev) => {
            const exists = prev.some((v) => v.id === vehicle.id)
            if (exists) return prev.map((v) => (v.id === vehicle.id ? { ...v, ...vehicle } : v))
            return [...prev, { id: vehicle.id, brand: vehicle.brand, model: vehicle.model, year: vehicle.year, plate: vehicle.plate, status: vehicle.status, price: vehicle.price }]
          })
          setFormData((prev) => ({ ...prev, vehicleId: String(vehicle.id) }))
          setVehicleSearch(`${vehicle.brand} ${vehicle.model} ${vehicle.year}${vehicle.plate ? ` – ${vehicle.plate}` : ''}`)
        }}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Excluir sinal"
        message="Tem certeza que deseja excluir este sinal de negócio?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setShowConfirmModal(false); setConfirmDeleteId(null) }}
      />

      {/* Modal Ver detalhes */}
      {showDetailsModal && selectedSinal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowDetailsModal(false); setSelectedSinal(null) }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto text-sm">
              <div className="flex items-center justify-between p-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Detalhes do sinal #{selectedSinal.id}</h2>
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedSinal(null) }}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between gap-2"><span className="text-gray-500">Data de criação</span><span className="text-gray-900 font-medium">{formatDate(selectedSinal.data)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Data de validade</span><span className="text-gray-900 font-medium">{selectedSinal.dataValidade ? formatDate(selectedSinal.dataValidade) : '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Veículo</span><span className="text-gray-900 font-medium text-right">{selectedSinal.vehicle ? `${selectedSinal.vehicle.brand} ${selectedSinal.vehicle.model} ${selectedSinal.vehicle.year}${selectedSinal.vehicle.plate ? ` – ${selectedSinal.vehicle.plate}` : ''}` : '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Valor do sinal</span><span className="text-gray-900 font-medium">{formatMoney(selectedSinal.valor)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Valor veículo</span><span className="text-gray-900 font-medium">{selectedSinal.valorVeiculo != null ? formatMoney(selectedSinal.valorVeiculo) : '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Valor em aberto</span><span className="text-gray-900 font-medium">{selectedSinal.valorEmAberto != null ? formatMoney(selectedSinal.valorEmAberto) : '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Cliente (Razão Social)</span><span className="text-gray-900 font-medium text-right">{selectedSinal.customer?.name ?? '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">CPF</span><span className="text-gray-900 font-medium">{formatDoc(selectedSinal.customer?.cpf)}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Vendedor</span><span className="text-gray-900 font-medium">{selectedSinal.seller?.name ?? '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Forma de pagamento</span><span className="text-gray-900 font-medium">{selectedSinal.formaPagamento ?? '-'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-500">Status</span><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[selectedSinal.status] ?? 'bg-gray-100 text-gray-800'}`}>{statusOptions.find((o) => o.value === selectedSinal.status)?.label ?? selectedSinal.status}</span></div>
                {selectedSinal.observacoes && (
                  <div className="pt-2 border-t border-gray-100"><span className="text-gray-500 block mb-1">Observações</span><span className="text-gray-900 text-xs">{selectedSinal.observacoes}</span></div>
                )}
              </div>
              <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedSinal(null) }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Fechar
                </button>
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedSinal(null); handleEdit(selectedSinal) }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </Layout>
  )
}

export default function SinalNegocioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500">Carregando...</div>}>
      <SinalNegocioPageContent />
    </Suspense>
  )
}

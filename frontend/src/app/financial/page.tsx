'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiFilter, FiSearch } from 'react-icons/fi'
import { formatCPF, formatCNPJ, formatPhone, removeMask } from '@/utils/formatters'

interface CategoriaFinanceira {
  id: number
  nome: string
  nivel: number
  codigo?: string
  parent?: CategoriaFinanceira
}

interface FinancialTransaction {
  id: number
  operacao?: 'receber' | 'pagar' | 'transferencia'
  type?: 'receber' | 'pagar' // Legado
  posicaoEstoque?: number
  solicitadoPor?: string
  autorizadoPor?: string
  dataVencimento?: string
  dueDate?: string | null // Legado
  mesReferencia?: string
  numeroDocumento?: string
  valorTitulo?: number
  amount?: number // Legado
  customerId?: number
  customer?: {
    id: number
    name: string
    cpf?: string
    phone?: string
  }
  categoriaFinanceiraId?: number
  categoriaFinanceira?: CategoriaFinanceira
  description: string
  observacoes?: string
  formaPagamento?: string
  isDespesa?: boolean
  recorrente?: boolean
  darBaixa?: boolean
  marcador?: string
  paidDate?: string | null
  status: 'pendente' | 'pago' | 'vencido'
  saleId?: number
  sale?: {
    id: number
    customer: {
      name: string
    }
  }
  // Campos específicos para transferência
  dataTransferencia?: string
  contaOrigem?: string
  contaDestino?: string
  valorTransferencia?: number
  createdAt: string
}

interface DashboardStats {
  receber: {
    total: number
    recebido: number
    pendente: number
  }
  pagar: {
    total: number
    pago: number
    pendente: number
  }
  saldo: number
}

export default function FinancialPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [customers, setCustomers] = useState<Array<{ id: number; name: string; cpf?: string; phone?: string }>>([])
  const [categoriasNivel4, setCategoriasNivel4] = useState<CategoriaFinanceira[]>([])
  const [todasCategorias, setTodasCategorias] = useState<CategoriaFinanceira[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [filters, setFilters] = useState({
    operacao: '' as '' | 'receber' | 'pagar' | 'transferencia',
    status: '' as '' | 'pendente' | 'pago' | 'vencido',
    startDate: '',
    endDate: '',
    mesReferencia: '',
  })
  const [activeTab, setActiveTab] = useState<'entradas' | 'saidas' | 'todos'>('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    operacao: 'pagar' as 'receber' | 'pagar' | 'transferencia',
    posicaoEstoque: '',
    solicitadoPor: '',
    autorizadoPor: '',
    dataVencimento: '',
    mesReferencia: '',
    numeroDocumento: '',
    valorTitulo: '',
    customerId: '',
    categoriaFinanceiraId: '',
    description: '',
    observacoes: '',
    formaPagamento: '',
    isDespesa: false,
    recorrente: false,
    darBaixa: false,
    marcador: '',
    status: 'pendente' as 'pendente' | 'pago',
    // Campos específicos para transferência
    dataTransferencia: '',
    contaOrigem: '',
    contaDestino: '',
    valorTransferencia: '',
  })

  useEffect(() => {
    loadData()
    loadCustomers()
    loadTodasCategorias()
  }, [filters])

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers')
      setCustomers(response.data)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    }
  }

  const loadTodasCategorias = async () => {
    try {
      const response = await api.get('/categoria-financeira?ativo=true')
      setTodasCategorias(response.data)
    } catch (error) {
      console.error('Erro ao carregar todas as categorias:', error)
    }
  }

  const loadData = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.operacao) params.append('operacao', filters.operacao)
      if (filters.status) params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.mesReferencia) params.append('mesReferencia', filters.mesReferencia)

      const [transactionsRes, dashboardRes] = await Promise.all([
        api.get(`/financial/transactions?${params.toString()}`),
        api.get(`/financial/dashboard?${filters.startDate || filters.endDate ? params.toString() : ''}`),
      ])

      // Marcar transações vencidas
      const now = new Date()
      const transactionsWithStatus = transactionsRes.data.map((t: any) => {
        const dataVenc = t.dataVencimento || t.dueDate
        if (t.status === 'pendente' && dataVenc && new Date(dataVenc) < now) {
          return { ...t, status: 'vencido' }
        }
        return t
      })

      setTransactions(transactionsWithStatus)
      setDashboardStats(dashboardRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setToast({ message: 'Erro ao carregar dados financeiros', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Formatar mês referência se necessário
      let mesRefFormatado = formData.mesReferencia
      if (mesRefFormatado && !mesRefFormatado.includes('/')) {
        // Se veio como YYYY-MM, converter para MM/YYYY
        const parts = mesRefFormatado.split('-')
        if (parts.length === 2) {
          mesRefFormatado = `${parts[1]}/${parts[0]}`
        }
      }

      const dataToSend: any = {
        operacao: formData.operacao,
        posicaoEstoque: formData.posicaoEstoque ? parseInt(formData.posicaoEstoque) : null,
        solicitadoPor: formData.solicitadoPor || null,
        autorizadoPor: formData.autorizadoPor || null,
        dataVencimento: formData.dataVencimento || null,
        mesReferencia: mesRefFormatado || null,
        numeroDocumento: formData.numeroDocumento || null,
        valorTitulo: formData.valorTitulo ? parseFloat(formData.valorTitulo) : null,
        customerId: formData.customerId ? parseInt(formData.customerId) : null,
        categoriaFinanceiraId: formData.categoriaFinanceiraId ? parseInt(formData.categoriaFinanceiraId) : null,
        description: formData.description,
        observacoes: formData.observacoes || null,
        formaPagamento: formData.formaPagamento || null,
        isDespesa: formData.isDespesa,
        recorrente: formData.recorrente,
        darBaixa: formData.darBaixa,
        marcador: formData.marcador || null,
        status: formData.status,
      }

      if (editingTransaction) {
        await api.put(`/financial/transactions/${editingTransaction.id}`, dataToSend)
        setToast({ message: 'Movimentação atualizada com sucesso!', type: 'success' })
      } else {
        await api.post('/financial/transactions', dataToSend)
        setToast({ message: 'Movimentação criada com sucesso!', type: 'success' })
      }
      setShowModal(false)
      setEditingTransaction(null)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Erro ao salvar transação:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar transação', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction)
    const operacao = (transaction.operacao || transaction.type || 'pagar') as 'receber' | 'pagar' | 'transferencia'
    const valor = transaction.valorTitulo || transaction.amount || 0
    const dataVenc = transaction.dataVencimento || transaction.dueDate
    const dataTransf = (transaction as any).dataTransferencia
    
    setFormData({
      operacao: operacao as 'receber' | 'pagar' | 'transferencia',
      posicaoEstoque: transaction.posicaoEstoque?.toString() || '',
      solicitadoPor: transaction.solicitadoPor || '',
      autorizadoPor: transaction.autorizadoPor || '',
      dataVencimento: dataVenc ? (typeof dataVenc === 'string' ? dataVenc.split('T')[0] : new Date(dataVenc).toISOString().split('T')[0]) : '',
      mesReferencia: transaction.mesReferencia || '',
      numeroDocumento: transaction.numeroDocumento || '',
      valorTitulo: valor.toString(),
      customerId: transaction.customerId?.toString() || '',
      categoriaFinanceiraId: transaction.categoriaFinanceiraId?.toString() || '',
      description: transaction.description,
      observacoes: transaction.observacoes || '',
      formaPagamento: transaction.formaPagamento || '',
      isDespesa: transaction.isDespesa || false,
      recorrente: transaction.recorrente || false,
      darBaixa: transaction.darBaixa || false,
      marcador: transaction.marcador || '',
      status: transaction.status === 'pago' ? 'pago' : 'pendente',
      // Campos específicos para transferência
      dataTransferencia: dataTransf ? (typeof dataTransf === 'string' ? dataTransf.split('T')[0] : new Date(dataTransf).toISOString().split('T')[0]) : '',
      contaOrigem: (transaction as any).contaOrigem || '',
      contaDestino: (transaction as any).contaDestino || '',
      valorTransferencia: (transaction as any).valorTransferencia?.toString() || '',
    })
    
    // Preencher busca de cliente se houver
    if (transaction.customer) {
      setCustomerSearch(transaction.customer.name)
    }
    
    setShowModal(true)
  }

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id)
    setShowConfirmModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    setShowConfirmModal(false)
    setDeleting(confirmDeleteId)
    try {
      await api.delete(`/financial/transactions/${confirmDeleteId}`)
      setToast({ message: 'Transação excluída com sucesso!', type: 'success' })
      loadData()
    } catch (error: any) {
      console.error('Erro ao excluir transação:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir transação', type: 'error' })
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowConfirmModal(false)
    setConfirmDeleteId(null)
  }

  const handleMarkAsPaid = async (id: number) => {
    try {
      await api.put(`/financial/transactions/${id}`, {
        status: 'pago',
        darBaixa: true,
        paidDate: new Date().toISOString(),
      })
      setToast({ message: 'Movimentação marcada como paga!', type: 'success' })
      loadData()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      setToast({ message: 'Erro ao marcar como pago', type: 'error' })
    }
  }

  // Fechar dropdown de cliente ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetForm = () => {
    setFormData({
      operacao: 'pagar',
      posicaoEstoque: '',
      solicitadoPor: '',
      autorizadoPor: '',
      dataVencimento: '',
      mesReferencia: '',
      numeroDocumento: '',
      valorTitulo: '',
      customerId: '',
      categoriaFinanceiraId: '',
      description: '',
      observacoes: '',
      formaPagamento: '',
      isDespesa: false,
      recorrente: false,
      darBaixa: false,
      marcador: '',
      status: 'pendente',
      // Campos específicos para transferência
      dataTransferencia: '',
      contaOrigem: '',
      contaDestino: '',
      valorTransferencia: '',
    })
    setCustomerSearch('')
    setShowCustomerDropdown(false)
  }

  const openModal = () => {
    resetForm()
    setEditingTransaction(null)
    setShowModal(true)
    // Definir data de vencimento padrão como hoje (se não for transferência)
    const today = new Date().toISOString().split('T')[0]
    setFormData(prev => {
      if (prev.operacao === 'transferencia') {
        return { ...prev, dataTransferencia: today }
      } else {
        return { ...prev, dataVencimento: today }
      }
    })
    // Definir mês referência padrão como mês atual (se não for transferência)
    const now = new Date()
    const mesRef = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    if ((formData.operacao as string) !== 'transferencia') {
      setFormData(prev => ({ ...prev, mesReferencia: mesRef }))
    }
  }

  const clearFilters = () => {
    setFilters({
      operacao: '',
      status: '',
      startDate: '',
      endDate: '',
      mesReferencia: '',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-100 text-green-800'
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'vencido':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago'
      case 'pendente':
        return 'Pendente'
      case 'vencido':
        return 'Vencido'
      default:
        return status
    }
  }

  const receitas = transactions.filter((t) => (t.operacao || t.type) === 'receber')
  const despesas = transactions.filter((t) => (t.operacao || t.type) === 'pagar')
  const transferencias = transactions.filter((t) => (t.operacao || t.type) === 'transferencia')

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-gray-600 mt-1">Gestão de entradas e saídas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <FiFilter />
              Filtros
            </button>
            <button
              onClick={openModal}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <FiPlus />
              Nova Movimentação
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Entradas</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    R$ {dashboardStats.receber.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {dashboardStats.receber.pendente > 0
                      ? `R$ ${dashboardStats.receber.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente`
                      : 'Tudo recebido'}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <FiTrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Saídas</p>
                  <p className="mt-2 text-2xl font-bold text-red-600">
                    R$ {dashboardStats.pagar.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {dashboardStats.pagar.pendente > 0
                      ? `R$ ${dashboardStats.pagar.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente`
                      : 'Tudo pago'}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <FiTrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Recebido</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    R$ {dashboardStats.receber.recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <FiCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Saldo</p>
                  <p
                    className={`mt-2 text-2xl font-bold ${
                      dashboardStats.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    R$ {dashboardStats.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Recebido - Pago</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FiDollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={filters.operacao}
                  onChange={(e) => setFilters({ ...filters, operacao: e.target.value as '' | 'receber' | 'pagar' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                >
                  <option value="">Todos</option>
                  <option value="receber">Entradas</option>
                  <option value="pagar">Saídas</option>
                  <option value="transferencia">Transferências</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês Referência</label>
                <input
                  type="month"
                  value={filters.mesReferencia}
                  onChange={(e) => {
                    const value = e.target.value
                    const formatted = value ? `${value.split('-')[1]}/${value.split('-')[0]}` : ''
                    setFilters({ ...filters, mesReferencia: formatted })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value as '' | 'pendente' | 'pago' | 'vencido' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="vencido">Vencido</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Abas de Navegação */}
        <div className="bg-white rounded-lg shadow p-1 flex gap-2">
          <button
            onClick={() => setActiveTab('todos')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'todos'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveTab('entradas')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'entradas'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Entradas ({receitas.length})
          </button>
          <button
            onClick={() => setActiveTab('saidas')}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'saidas'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Saídas ({despesas.length})
          </button>
        </div>

        {/* Lista de Transações */}
        {loading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 max-h-[calc(100vh-420px)] flex flex-col">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900">
                {activeTab === 'entradas' && `Entradas (${receitas.length})`}
                {activeTab === 'saidas' && `Saídas (${despesas.length})`}
                {activeTab === 'todos' && `Todas as Transações (${transactions.length})`}
              </h3>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const filteredTransactions =
                      activeTab === 'entradas'
                        ? receitas
                        : activeTab === 'saidas'
                        ? despesas
                        : transactions

                    return filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          Nenhuma transação encontrada
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((transaction) => {
                        const operacao = transaction.operacao || transaction.type || 'pagar'
                        const valor = transaction.valorTitulo || transaction.amount || 0
                        const dataVenc = transaction.dataVencimento || transaction.dueDate
                        return (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                operacao === 'receber'
                                  ? 'bg-green-100 text-green-800'
                                  : operacao === 'transferencia'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {operacao === 'receber' ? 'Entrada' : operacao === 'transferencia' ? 'Transferência' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            {transaction.customer && (
                              <div className="text-xs text-gray-500">{transaction.customer.name}</div>
                            )}
                            {transaction.sale && (
                              <div className="text-xs text-gray-500">Venda #{transaction.sale.id}</div>
                            )}
                            {transaction.numeroDocumento && (
                              <div className="text-xs text-gray-500">Doc: {transaction.numeroDocumento}</div>
                            )}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              operacao === 'receber' ? 'text-green-600' : operacao === 'transferencia' ? 'text-blue-600' : 'text-red-600'
                            }`}
                          >
                            {operacao === 'receber' ? '+' : operacao === 'transferencia' ? '↔' : '-'}R${' '}
                            {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {dataVenc
                              ? new Date(dataVenc).toLocaleDateString('pt-BR')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                transaction.status
                              )}`}
                            >
                              {getStatusLabel(transaction.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {transaction.status !== 'pago' && (
                              <button
                                onClick={() => handleMarkAsPaid(transaction.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Marcar como pago"
                              >
                                <FiCheck />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <FiEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(transaction.id)}
                              disabled={deleting === transaction.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deleting === transaction.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <FiTrash2 />
                              )}
                            </button>
                          </td>
                        </tr>
                        )
                      })
                    )
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Nova Movimentação */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900">
                  {editingTransaction ? 'Editar Movimentação' : 'Nova Movimentação'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Linha 1: Operação e Posição Estoque */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Operação *</label>
                      <select
                        required
                        value={formData.operacao}
                        onChange={(e) => setFormData({ ...formData, operacao: e.target.value as 'receber' | 'pagar' | 'transferencia' })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="pagar">Pagar</option>
                        <option value="receber">Receber</option>
                        <option value="transferencia">Transferência</option>
                      </select>
                    </div>
                    {formData.operacao !== 'transferencia' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Posição estoque *</label>
                        <input
                          type="number"
                          required
                          value={formData.posicaoEstoque}
                          onChange={(e) => setFormData({ ...formData, posicaoEstoque: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="1"
                          min="1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Campos específicos para Transferência */}
                  {formData.operacao === 'transferencia' ? (
                    <>
                      {/* Data transferência */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Data transferência *</label>
                        <input
                          type="date"
                          required
                          value={formData.dataTransferencia}
                          onChange={(e) => setFormData({ ...formData, dataTransferencia: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>

                      {/* Conta origem e Conta destino */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Conta origem *</label>
                          <input
                            type="text"
                            required
                            value={formData.contaOrigem}
                            onChange={(e) => setFormData({ ...formData, contaOrigem: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Ex: Conta Corrente - Banco X"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Conta destino *</label>
                          <input
                            type="text"
                            required
                            value={formData.contaDestino}
                            onChange={(e) => setFormData({ ...formData, contaDestino: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Ex: Conta Poupança - Banco Y"
                          />
                        </div>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>

                      {/* Valor transferência */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor transferência *</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          value={formData.valorTransferencia}
                          onChange={(e) => setFormData({ ...formData, valorTransferencia: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="0,00"
                        />
                      </div>

                      {/* Marcador */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador</label>
                        <input
                          type="text"
                          value={formData.marcador}
                          onChange={(e) => setFormData({ ...formData, marcador: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Linha 2: Solicitado por e Autorizado por */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Solicitado por</label>
                          <input
                            type="text"
                            value={formData.solicitadoPor}
                            onChange={(e) => setFormData({ ...formData, solicitadoPor: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Autorizado por</label>
                          <input
                            type="text"
                            value={formData.autorizadoPor}
                            onChange={(e) => setFormData({ ...formData, autorizadoPor: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>

                      {/* Linha 3: Data vencimento e Mês referência */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Data vencimento *</label>
                          <input
                            type="date"
                            required={true}
                            value={formData.dataVencimento}
                            onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Mês referência *</label>
                          <input
                            type="month"
                            required={true}
                            value={formData.mesReferencia ? `${formData.mesReferencia.split('/')[1]}-${formData.mesReferencia.split('/')[0]}` : ''}
                            onChange={(e) => {
                              const value = e.target.value
                              const formatted = value ? `${value.split('-')[1]}/${value.split('-')[0]}` : ''
                              setFormData({ ...formData, mesReferencia: formatted })
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>

                      {/* Linha 4: Nº documento e Valor título */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº documento</label>
                          <input
                            type="text"
                            value={formData.numeroDocumento}
                            onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor título *</label>
                          <input
                            type="number"
                            required={true}
                            step="0.01"
                            min="0"
                            value={formData.valorTitulo}
                            onChange={(e) => setFormData({ ...formData, valorTitulo: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="0,00"
                          />
                        </div>
                      </div>

                      {/* Cliente/Fornecedor */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Cliente/Fornecedor</label>
                        <div className="relative customer-search-container">
                      <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value)
                          setShowCustomerDropdown(e.target.value.length >= 3)
                        }}
                        onFocus={() => {
                          if (customerSearch.length >= 3) {
                            setShowCustomerDropdown(true)
                          }
                        }}
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Digite no mínimo 3 caracteres para localizar o cliente / fornecedor (nome ou CPF/CNPJ)"
                      />
                      {showCustomerDropdown && customerSearch.length >= 3 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                          {customers
                            .filter(c => 
                              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                              c.cpf?.includes(customerSearch) ||
                              c.phone?.includes(customerSearch)
                            )
                            .slice(0, 10)
                            .map(customer => (
                              <div
                                key={customer.id}
                                onClick={() => {
                                  setCustomerSearch(customer.name)
                                  setFormData({ ...formData, customerId: customer.id.toString() })
                                  setShowCustomerDropdown(false)
                                }}
                                className="px-3 py-2 text-xs hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{customer.name}</div>
                                {customer.cpf && (
                                  <div className="text-gray-500 text-xs">{customer.cpf}</div>
                                )}
                                {customer.phone && (
                                  <div className="text-gray-500 text-xs">{customer.phone}</div>
                                )}
                              </div>
                            ))}
                          {customers.filter(c => 
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.cpf?.includes(customerSearch) ||
                            c.phone?.includes(customerSearch)
                          ).length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-500">Nenhum cliente encontrado</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Categoria financeira (só aparece quando não é transferência) */}
                  {(formData.operacao as string) !== 'transferencia' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Categoria financeira *</label>
                      <select
                        required
                        value={formData.categoriaFinanceiraId}
                        onChange={(e) => setFormData({ ...formData, categoriaFinanceiraId: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione</option>
                        {todasCategorias.map(cat => {
                          // Construir o caminho completo da hierarquia
                          const getFullPath = (categoria: CategoriaFinanceira): string => {
                            const parts: string[] = []
                            let current: CategoriaFinanceira | null | undefined = categoria
                            
                            // Coletar todos os níveis da hierarquia
                            while (current) {
                              parts.unshift(current.nome)
                              current = current.parent
                            }
                            
                            return parts.join(' > ')
                          }
                          return (
                            <option key={cat.id} value={cat.id.toString()}>
                              {getFullPath(cat)}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                      {/* Descrição */}
                      {(formData.operacao as string) !== 'transferencia' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                          <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Descrição (para transferência já está acima) */}
                  {(formData.operacao as string) !== 'transferencia' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                      <input
                        type="text"
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  )}

                  {/* Observações */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações</label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      rows={2}
                    />
                  </div>

                  {/* Forma pagamento/recebimento (só aparece quando não é transferência) */}
                  {(formData.operacao as string) !== 'transferencia' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Forma pagamento/recebimento</label>
                      <select
                        value={formData.formaPagamento}
                        onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">-------</option>
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">PIX</option>
                        <option value="cartao_credito">Cartão de Crédito</option>
                        <option value="cartao_debito">Cartão de Débito</option>
                        <option value="transferencia_bancaria">Transferência Bancária</option>
                        <option value="cheque">Cheque</option>
                        <option value="boleto">Boleto</option>
                        <option value="financiamento">Financiamento</option>
                        <option value="financiamento_proprio">Financiamento Próprio</option>
                        <option value="consorcio">Consórcio</option>
                        <option value="troco">Troco</option>
                        <option value="veiculo">Veículo (Troca)</option>
                        <option value="deposito">Depósito</option>
                        <option value="ted">TED</option>
                        <option value="doc">DOC</option>
                        <option value="credito_loja">Crédito Loja</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                  )}

                  {/* Checkboxes (só aparecem quando não é transferência) */}
                  {(formData.operacao as string) !== 'transferencia' && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isDespesa"
                          checked={formData.isDespesa}
                          onChange={(e) => setFormData({ ...formData, isDespesa: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="isDespesa" className="ml-2 text-xs text-gray-700">
                          Este título é uma despesa? (Ao marcar esta opção o título vai aparecer no DRE)
                        </label>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="recorrente"
                            checked={formData.recorrente}
                            onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <label htmlFor="recorrente" className="ml-2 text-xs text-gray-700">
                            Recorrente?
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="darBaixa"
                            checked={formData.darBaixa}
                            onChange={(e) => setFormData({ ...formData, darBaixa: e.target.checked })}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <label htmlFor="darBaixa" className="ml-2 text-xs text-gray-700">
                            Dar baixa
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Marcador (só aparece quando não é transferência, pois já está no bloco de transferência) */}
                  {(formData.operacao as string) !== 'transferencia' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador</label>
                      <input
                        type="text"
                        value={formData.marcador}
                        onChange={(e) => setFormData({ ...formData, marcador: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  )}

                  {/* Status (se editando) */}
                  {editingTransaction && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pendente' | 'pago' })}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingTransaction(null)
                        resetForm()
                      }}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                    >
                      {saving ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta transação?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}

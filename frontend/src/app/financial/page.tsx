'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiFilter } from 'react-icons/fi'

interface FinancialTransaction {
  id: number
  type: 'receber' | 'pagar'
  description: string
  amount: number
  dueDate?: string | null
  paidDate?: string | null
  status: 'pendente' | 'pago' | 'vencido'
  saleId?: number
  sale?: {
    id: number
    customer: {
      name: string
    }
  }
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
  const [filters, setFilters] = useState({
    type: '' as '' | 'receber' | 'pagar',
    status: '' as '' | 'pendente' | 'pago' | 'vencido',
    startDate: '',
    endDate: '',
  })
  const [activeTab, setActiveTab] = useState<'entradas' | 'saidas' | 'todos'>('todos')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    type: 'receber' as 'receber' | 'pagar',
    description: '',
    amount: '',
    dueDate: '',
    saleId: '',
    status: 'pendente' as 'pendente' | 'pago',
  })

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const [transactionsRes, dashboardRes] = await Promise.all([
        api.get(`/financial/transactions?${params.toString()}`),
        api.get(`/financial/dashboard?${filters.startDate || filters.endDate ? params.toString() : ''}`),
      ])

      // Marcar transações vencidas
      const now = new Date()
      const transactionsWithStatus = transactionsRes.data.map((t: FinancialTransaction) => {
        if (t.status === 'pendente' && t.dueDate && new Date(t.dueDate) < now) {
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
      const dataToSend = {
        ...formData,
        amount: parseFloat(formData.amount),
        saleId: formData.saleId ? parseInt(formData.saleId) : null,
      }

      if (editingTransaction) {
        await api.put(`/financial/transactions/${editingTransaction.id}`, dataToSend)
        setToast({ message: 'Transação atualizada com sucesso!', type: 'success' })
      } else {
        await api.post('/financial/transactions', dataToSend)
        setToast({ message: 'Transação criada com sucesso!', type: 'success' })
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
    setFormData({
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount.toString(),
      dueDate: transaction.dueDate ? transaction.dueDate.split('T')[0] : '',
      saleId: transaction.saleId?.toString() || '',
      status: transaction.status === 'pago' ? 'pago' : 'pendente',
    })
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
        paidDate: new Date().toISOString(),
      })
      setToast({ message: 'Transação marcada como paga!', type: 'success' })
      loadData()
    } catch (error) {
      console.error('Erro ao marcar como pago:', error)
      setToast({ message: 'Erro ao marcar como pago', type: 'error' })
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'receber',
      description: '',
      amount: '',
      dueDate: '',
      saleId: '',
      status: 'pendente',
    })
  }

  const openModal = () => {
    resetForm()
    setEditingTransaction(null)
    setShowModal(true)
  }

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      startDate: '',
      endDate: '',
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

  const receitas = transactions.filter((t) => t.type === 'receber')
  const despesas = transactions.filter((t) => t.type === 'pagar')

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
              Nova Transação
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
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as '' | 'receber' | 'pagar' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                >
                  <option value="">Todos</option>
                  <option value="receber">Entradas</option>
                  <option value="pagar">Saídas</option>
                </select>
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
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.type === 'receber'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.type === 'receber' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            {transaction.sale && (
                              <div className="text-xs text-gray-500">Venda #{transaction.sale.id}</div>
                            )}
                          </td>
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              transaction.type === 'receber' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.type === 'receber' ? '+' : '-'}R${' '}
                            {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.dueDate
                              ? new Date(transaction.dueDate).toLocaleDateString('pt-BR')
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
                      ))
                    )
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'receber' | 'pagar' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="receber">Entrada</option>
                      <option value="pagar">Saída</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="Ex: Venda de veículo, Aluguel, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento (opcional)</label>
                      <input
                        type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                    <p className="mt-1 text-xs text-gray-500">Deixe vazio para usar a data atual</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID da Venda (opcional)</label>
                    <input
                      type="number"
                      value={formData.saleId}
                      onChange={(e) => setFormData({ ...formData, saleId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="Deixe vazio se não for relacionado a venda"
                    />
                  </div>
                  {editingTransaction && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as 'pendente' | 'pago' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                  )}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingTransaction(null)
                        resetForm()
                      }}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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

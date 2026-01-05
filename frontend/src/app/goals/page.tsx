'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { FiTarget, FiEdit, FiTrash2, FiPlus, FiTrendingUp, FiFilter, FiSearch, FiX } from 'react-icons/fi'

interface Goal {
  id: number
  userId: number
  type: 'sales' | 'revenue' | 'profit'
  targetValue: number
  currentValue: number
  period: 'monthly' | 'quarterly' | 'yearly'
  startDate: string | null
  endDate: string | null
  status: string
  user?: {
    id: number
    name: string
    email: string
  }
}

interface User {
  id: number
  name: string
  email: string
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [allGoals, setAllGoals] = useState<Goal[]>([]) // Todas as metas para filtros
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  
  // Filtros
  const [filters, setFilters] = useState({
    userId: '',
    type: '',
    period: '',
    status: '',
    search: '',
  })

  const [formData, setFormData] = useState({
    userId: '',
    type: 'sales' as 'sales' | 'revenue' | 'profit',
    targetValue: '',
    period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: '',
    endDate: '',
  })

  const applyFilters = (goalsToFilter?: Goal[]) => {
    const goalsToUse = goalsToFilter || allGoals
    let filtered = [...goalsToUse]

    // Filtro de busca (por nome do vendedor)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(goal =>
        goal.user?.name.toLowerCase().includes(searchLower) ||
        goal.user?.email.toLowerCase().includes(searchLower)
      )
    }

    setGoals(filtered)
  }

  const loadData = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.type) params.append('type', filters.type)
      if (filters.period) params.append('period', filters.period)
      if (filters.status) params.append('status', filters.status)

      const [goalsRes, usersRes] = await Promise.all([
        api.get(`/goals?${params.toString()}`),
        api.get('/users/sellers').catch(() => ({ data: [] })), // Usa rota pública de vendedores
      ])
      const goalsData = goalsRes.data || []
      setAllGoals(goalsData)
      applyFilters(goalsData)
      setUsers(usersRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setToast({ message: 'Erro ao carregar dados', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters.userId, filters.type, filters.period, filters.status])

  useEffect(() => {
    if (allGoals.length > 0) {
      applyFilters()
    }
  }, [filters.search])

  useEffect(() => {
    applyFilters()
  }, [filters.search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSend: any = {
        ...formData,
        targetValue: parseFloat(formData.targetValue),
      }
      
      // Só inclui datas se foram preenchidas
      if (!formData.startDate) delete dataToSend.startDate
      if (!formData.endDate) delete dataToSend.endDate

      if (editingGoal) {
        await api.put(`/goals/${editingGoal.id}`, dataToSend)
        setToast({ message: 'Meta atualizada com sucesso!', type: 'success' })
      } else {
        await api.post('/goals', dataToSend)
        setToast({ message: 'Meta criada com sucesso!', type: 'success' })
      }
      setShowModal(false)
      setEditingGoal(null)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Erro ao salvar meta:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar meta', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      userId: goal.userId.toString(),
      type: goal.type,
      targetValue: goal.targetValue.toString(),
      period: goal.period,
      startDate: goal.startDate ? goal.startDate.split('T')[0] : '',
      endDate: goal.endDate ? goal.endDate.split('T')[0] : '',
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
      await api.delete(`/goals/${confirmDeleteId}`)
      setToast({ message: 'Meta excluída com sucesso!', type: 'success' })
      loadData()
    } catch (error) {
      console.error('Erro ao excluir meta:', error)
      setToast({ message: 'Erro ao excluir meta', type: 'error' })
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowConfirmModal(false)
    setConfirmDeleteId(null)
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      type: 'sales',
      targetValue: '',
      period: 'monthly',
      startDate: '',
      endDate: '',
    })
  }

  const openModal = () => {
    resetForm()
    setEditingGoal(null)
    setShowModal(true)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sales':
        return 'Vendas'
      case 'revenue':
        return 'Receita'
      case 'profit':
        return 'Lucro'
      default:
        return type
    }
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'monthly':
        return 'Mensal'
      case 'quarterly':
        return 'Trimestral'
      case 'yearly':
        return 'Anual'
      default:
        return period
    }
  }

  const getProgress = (goal: Goal) => {
    if (goal.targetValue === 0) return 0
    const progress = (goal.currentValue / goal.targetValue) * 100
    return Math.min(progress, 100)
  }

  const formatValue = (goal: Goal, value: number) => {
    if (goal.type === 'sales') {
      return value.toString()
    } else {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
  }

  const resetFilters = () => {
    setFilters({
      userId: '',
      type: '',
      period: '',
      status: '',
      search: '',
    })
  }

  // Estatísticas
  const getStats = () => {
    const totalGoals = allGoals.length
    const totalTarget = allGoals.reduce((sum, g) => sum + g.targetValue, 0)
    const totalCurrent = allGoals.reduce((sum, g) => sum + g.currentValue, 0)
    const avgProgress = totalGoals > 0 
      ? allGoals.reduce((sum, g) => sum + getProgress(g), 0) / totalGoals 
      : 0
    const completedGoals = allGoals.filter(g => getProgress(g) >= 100).length

    return {
      totalGoals,
      totalTarget,
      totalCurrent,
      avgProgress,
      completedGoals
    }
  }

  const stats = getStats()

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Metas</h1>
            <p className="text-gray-600 mt-1">Gerencie metas de vendas, receita e lucro</p>
          </div>
          <button
            onClick={openModal}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <FiPlus />
            Nova Meta
          </button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Total de Metas</div>
            <div className="text-xl font-bold text-gray-900">{stats.totalGoals}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Metas Concluídas</div>
            <div className="text-xl font-bold text-green-600">{stats.completedGoals}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Meta Total</div>
            <div className="text-lg font-bold text-gray-900">
              {stats.totalTarget.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Alcance Total</div>
            <div className="text-lg font-bold text-blue-600">
              {stats.totalCurrent.toLocaleString('pt-BR')}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Progresso Médio</div>
            <div className="text-xl font-bold text-primary-600">{stats.avgProgress.toFixed(1)}%</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FiFilter className="text-gray-600" />
              Filtros
            </h2>
            {(filters.userId || filters.type || filters.period || filters.status || filters.search) && (
              <button
                onClick={resetFilters}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <FiX />
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Nome ou email..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              >
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              >
                <option value="">Todos</option>
                <option value="sales">Vendas</option>
                <option value="revenue">Receita</option>
                <option value="profit">Lucro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              >
                <option value="">Todos</option>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              >
                <option value="">Todos</option>
                <option value="active">Ativa</option>
                <option value="completed">Concluída</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 max-h-[calc(100vh-220px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meta
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Atual
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {goals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
                        Nenhuma meta cadastrada
                      </td>
                    </tr>
                  ) : (
                    goals.map((goal) => {
                      const progress = getProgress(goal)
                      return (
                        <tr key={goal.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {goal.user?.name || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {getTypeLabel(goal.type)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatValue(goal, goal.targetValue)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatValue(goal, goal.currentValue)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  progress >= 100
                                    ? 'bg-green-600'
                                    : progress >= 75
                                    ? 'bg-blue-600'
                                    : progress >= 50
                                    ? 'bg-yellow-600'
                                    : 'bg-red-600'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}%</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>{getPeriodLabel(goal.period)}</div>
                            {goal.startDate && goal.endDate && (
                              <div className="text-xs">
                                {new Date(goal.startDate).toLocaleDateString('pt-BR')} até{' '}
                                {new Date(goal.endDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEdit(goal)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <FiEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(goal.id)}
                              disabled={deleting === goal.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deleting === goal.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <FiTrash2 />
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
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
                  {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor *</label>
                    <select
                      required
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      disabled={!!editingGoal}
                    >
                      <option value="">Selecione um vendedor</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({ ...formData, type: e.target.value as 'sales' | 'revenue' | 'profit' })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="sales">Vendas (quantidade)</option>
                        <option value="revenue">Receita (R$)</option>
                        <option value="profit">Lucro (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meta *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={formData.targetValue}
                        onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder={formData.type === 'sales' ? 'Ex: 10' : 'Ex: 50000'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Período *</label>
                    <select
                      required
                      value={formData.period}
                      onChange={(e) =>
                        setFormData({ ...formData, period: e.target.value as 'monthly' | 'quarterly' | 'yearly' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Início (opcional)</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim (opcional)</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingGoal(null)
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
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta meta?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}


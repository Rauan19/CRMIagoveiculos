'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'

interface Customer {
  id: number
  name: string
  phone: string
  cpf?: string
}

interface TradeIn {
  id: number
  customerId: number
  brand: string
  model: string
  year: number
  km?: number
  valueFipe: number
  valueOffer: number
  photos?: string
  status: string
  createdAt: string
  customer?: Customer
  sale?: {
    id: number
    status: string
  }
}

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aceito: 'bg-green-100 text-green-800',
  recusado: 'bg-red-100 text-red-800',
  vendido: 'bg-blue-100 text-blue-800',
}

export default function TradeInsPage() {
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTradeIn, setEditingTradeIn] = useState<TradeIn | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    brand: '',
    model: '',
    year: '',
    km: '',
    valueFipe: '',
    valueOffer: '',
    status: 'pendente',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tradeInsRes, customersRes] = await Promise.all([
        api.get('/trade-ins'),
        api.get('/customers'),
      ])
      setTradeIns(tradeInsRes.data || [])
      setCustomers(customersRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setToast({ message: 'Erro ao carregar dados.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSend = {
        customerId: parseInt(formData.customerId),
        brand: formData.brand,
        model: formData.model,
        year: parseInt(formData.year),
        km: formData.km ? parseInt(formData.km) : null,
        valueFipe: parseFloat(formData.valueFipe),
        valueOffer: parseFloat(formData.valueOffer),
        status: formData.status,
      }
      
      if (editingTradeIn) {
        await api.put(`/trade-ins/${editingTradeIn.id}`, dataToSend)
        setToast({ message: 'Trade-in atualizado com sucesso!', type: 'success' })
      } else {
        await api.post('/trade-ins', dataToSend)
        setToast({ message: 'Trade-in criado com sucesso!', type: 'success' })
      }
      setShowModal(false)
      setEditingTradeIn(null)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Erro ao salvar trade-in:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar trade-in', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (tradeIn: TradeIn) => {
    setEditingTradeIn(tradeIn)
    setFormData({
      customerId: tradeIn.customerId.toString(),
      brand: tradeIn.brand,
      model: tradeIn.model,
      year: tradeIn.year.toString(),
      km: tradeIn.km?.toString() || '',
      valueFipe: tradeIn.valueFipe.toString(),
      valueOffer: tradeIn.valueOffer.toString(),
      status: tradeIn.status,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este trade-in?')) return
    setDeleting(id)
    try {
      await api.delete(`/trade-ins/${id}`)
      setToast({ message: 'Trade-in excluído com sucesso!', type: 'success' })
      await loadData()
    } catch (error: any) {
      console.error('Erro ao excluir trade-in:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir trade-in', type: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const resetForm = () => {
    setFormData({
      customerId: '',
      brand: '',
      model: '',
      year: '',
      km: '',
      valueFipe: '',
      valueOffer: '',
      status: 'pendente',
    })
  }

  const openModal = () => {
    resetForm()
    setEditingTradeIn(null)
    setShowModal(true)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avaliações de Entrada (Trade-In)</h1>
            <p className="text-sm text-gray-600 mt-1">
              Quando um cliente quer trocar o veículo dele pelo da loja. Avalie o veículo, defina o valor FIPE e o valor oferecido como entrada.
            </p>
          </div>
          <button
            onClick={openModal}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
          >
            Nova Avaliação
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden max-h-[calc(100vh-220px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veículo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor FIPE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Oferecido
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
                  {tradeIns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        Nenhuma avaliação cadastrada. Clique em "Nova Avaliação" para começar.
                      </td>
                    </tr>
                  ) : (
                    tradeIns.map((tradeIn) => (
                      <tr key={tradeIn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {tradeIn.customer?.name || '-'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tradeIn.customer?.phone || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {tradeIn.brand} {tradeIn.model}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tradeIn.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tradeIn.km ? tradeIn.km.toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          R$ {tradeIn.valueFipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          R$ {tradeIn.valueOffer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[tradeIn.status] || 'bg-gray-100 text-gray-800'}`}>
                            {tradeIn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(tradeIn)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(tradeIn.id)}
                            disabled={deleting === tradeIn.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === tradeIn.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </td>
                      </tr>
                    ))
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
                <div className="mb-4">
                  <h2 className="text-xl font-bold mb-1">
                    {editingTradeIn ? 'Editar Avaliação' : 'Nova Avaliação de Entrada'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Avalie o veículo que o cliente quer usar como entrada na compra. Informe o valor FIPE e o valor que você oferecerá.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                      <select
                        required
                        value={formData.customerId}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Selecione um cliente</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                      <input
                        type="text"
                        required
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                      <input
                        type="text"
                        required
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ano *</label>
                      <input
                        type="number"
                        required
                        min="1900"
                        max="2100"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">KM</label>
                      <input
                        type="number"
                        value={formData.km}
                        onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor FIPE *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.valueFipe}
                        onChange={(e) => setFormData({ ...formData, valueFipe: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor Oferecido *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.valueOffer}
                        onChange={(e) => setFormData({ ...formData, valueOffer: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="aceito">Aceito</option>
                        <option value="recusado">Recusado</option>
                        <option value="vendido">Vendido</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingTradeIn(null)
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
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  )
}

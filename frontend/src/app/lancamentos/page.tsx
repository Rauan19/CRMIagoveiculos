'use client'

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { useAuthStore } from '@/store/authStore'
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiSearch, FiX } from 'react-icons/fi'
import { formatCPF, formatCNPJ, removeMask } from '@/utils/formatters'

interface Supplier {
  id: number
  name: string
  cpf?: string
  phone?: string
  pessoaType?: string
}

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
}

interface LancamentoItem {
  id?: number
  vehicleId?: number
  vehicle?: Vehicle
  description: string
  serviceDate: string
  status: string
  value: number
  addToCost?: boolean
}

interface Lancamento {
  id: number
  supplierId?: number
  supplier?: Supplier
  tipo: string
  marcador?: string
  dataVencimento: string
  numeroDocumento?: string
  informarFinanceiro: boolean
  items: LancamentoItem[]
  usuario?: {
    id: number
    name: string
  }
  createdAt: string
  // Campos calculados
  totalCusto?: number
  totalValor?: number
}

export default function LancamentosPage() {
  const { user } = useAuthStore()
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null)
  const [viewingLancamento, setViewingLancamento] = useState<Lancamento | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  
  // Busca de fornecedores
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const supplierSearchRef = useRef<HTMLInputElement>(null)
  const supplierDropdownRef = useRef<HTMLDivElement>(null)
  
  // Busca de veículos
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const vehicleSearchRef = useRef<HTMLInputElement>(null)
  const vehicleDropdownRef = useRef<HTMLDivElement>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    supplierId: '',
    tipo: 'Despesa',
    marcador: '',
    dataVencimento: '',
    numeroDocumento: '',
    informarFinanceiro: false,
  })
  
  const [lancamentoItems, setLancamentoItems] = useState<LancamentoItem[]>([])
  const [currentItem, setCurrentItem] = useState<LancamentoItem>({
    description: '',
    serviceDate: '',
    status: '',
    value: 0,
    addToCost: false,
  })
  const [copyToNext, setCopyToNext] = useState(false)

  useEffect(() => {
    loadLancamentos()
    loadSuppliers()
    loadVehicles()
  }, [])

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node) &&
          supplierSearchRef.current && !supplierSearchRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false)
      }
      if (vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(event.target as Node) &&
          vehicleSearchRef.current && !vehicleSearchRef.current.contains(event.target as Node)) {
        setShowVehicleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadLancamentos = async () => {
    try {
      setLoading(true)
      // TODO: Implementar endpoint no backend
      // const response = await api.get('/lancamentos')
      // setLancamentos(response.data)
      // Por enquanto, usar dados mock
      setLancamentos([])
    } catch (error: any) {
      console.error('Erro ao carregar lançamentos:', error)
      setToast({ message: 'Erro ao carregar lançamentos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadSuppliers = async () => {
    try {
      const response = await api.get('/customers')
      setSuppliers(response.data)
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error)
    }
  }

  const loadVehicles = async () => {
    try {
      const response = await api.get('/vehicles')
      setVehicles(response.data)
    } catch (error) {
      console.error('Erro ao carregar veículos:', error)
    }
  }

  const handleSupplierSearch = (value: string) => {
    setSupplierSearch(value)
    setShowSupplierDropdown(value.length >= 3)
    if (value.length < 3) {
      setSelectedSupplier(null)
    }
  }

  const filteredSuppliers = suppliers.filter(supplier => {
    if (supplierSearch.length < 3) return false
    const searchLower = supplierSearch.toLowerCase()
    const nameMatch = supplier.name.toLowerCase().includes(searchLower)
    const cpfMatch = supplier.cpf && supplier.cpf.includes(removeMask(supplierSearch))
    return nameMatch || cpfMatch
  })

  const handleVehicleSearch = (value: string) => {
    setVehicleSearch(value)
    setShowVehicleDropdown(value.length > 0)
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!vehicleSearch) return false
    const searchLower = vehicleSearch.toLowerCase()
    const brandMatch = vehicle.brand?.toLowerCase().includes(searchLower)
    const modelMatch = vehicle.model?.toLowerCase().includes(searchLower)
    const plateMatch = vehicle.plate?.toLowerCase().includes(searchLower)
    const fullName = `${vehicle.brand} ${vehicle.model} ${vehicle.year}`.toLowerCase()
    return brandMatch || modelMatch || plateMatch || fullName.includes(searchLower)
  })

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setFormData({ ...formData, supplierId: supplier.id.toString() })
    setSupplierSearch(supplier.name)
    setShowSupplierDropdown(false)
  }

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setCurrentItem({ ...currentItem, vehicleId: vehicle.id, vehicle })
    setVehicleSearch(`${vehicle.brand} ${vehicle.model} ${vehicle.year}${vehicle.plate ? ` - ${vehicle.plate}` : ''}`)
    setShowVehicleDropdown(false)
  }

  const handleAddItem = () => {
    if (!currentItem.description || !currentItem.serviceDate || !currentItem.status || !currentItem.value) {
      setToast({ message: 'Preencha todos os campos obrigatórios', type: 'error' })
      return
    }

    const newItem: LancamentoItem = {
      ...currentItem,
      value: parseFloat(currentItem.value.toString()),
    }

    setLancamentoItems([...lancamentoItems, newItem])

    if (copyToNext) {
      // Manter dados para próximo lançamento
      setCurrentItem({
        vehicleId: currentItem.vehicleId,
        vehicle: currentItem.vehicle,
        description: currentItem.description,
        serviceDate: '',
        status: currentItem.status,
        value: currentItem.value,
        addToCost: currentItem.addToCost,
      })
      setVehicleSearch(vehicleSearch)
      setSelectedVehicle(selectedVehicle)
    } else {
      // Limpar formulário
      setCurrentItem({
        description: '',
        serviceDate: '',
        status: '',
        value: 0,
        addToCost: false,
      })
      setVehicleSearch('')
      setSelectedVehicle(null)
    }

    setShowAddItemModal(false)
    setCopyToNext(false)
  }

  const handleRemoveItem = (index: number) => {
    setLancamentoItems(lancamentoItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const totalValor = lancamentoItems.reduce((sum, item) => sum + (item.value || 0), 0)
    const totalCusto = lancamentoItems
      .filter(item => item.addToCost)
      .reduce((sum, item) => sum + (item.value || 0), 0)
    return { totalValor, totalCusto }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.dataVencimento) {
      setToast({ message: 'Preencha a data de vencimento', type: 'error' })
      return
    }

    if (lancamentoItems.length === 0) {
      setToast({ message: 'Adicione pelo menos um lançamento', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const dataToSend = {
        ...formData,
        supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
        items: lancamentoItems,
      }

      if (editingLancamento) {
        // TODO: Implementar endpoint PUT
        // await api.put(`/lancamentos/${editingLancamento.id}`, dataToSend)
        setToast({ message: 'Lançamento atualizado com sucesso!', type: 'success' })
      } else {
        // TODO: Implementar endpoint POST
        // await api.post('/lancamentos', dataToSend)
        setToast({ message: 'Lançamento criado com sucesso!', type: 'success' })
      }

      setShowModal(false)
      resetForm()
      loadLancamentos()
    } catch (error: any) {
      console.error('Erro ao salvar lançamento:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar lançamento', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (lancamento: Lancamento) => {
    setEditingLancamento(lancamento)
    setFormData({
      supplierId: lancamento.supplierId?.toString() || '',
      tipo: lancamento.tipo,
      marcador: lancamento.marcador || '',
      dataVencimento: lancamento.dataVencimento.split('T')[0],
      numeroDocumento: lancamento.numeroDocumento || '',
      informarFinanceiro: lancamento.informarFinanceiro,
    })
    setLancamentoItems(lancamento.items || [])
    if (lancamento.supplier) {
      setSelectedSupplier(lancamento.supplier)
      setSupplierSearch(lancamento.supplier.name)
    }
    setShowModal(true)
  }

  const handleView = (lancamento: Lancamento) => {
    setViewingLancamento(lancamento)
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
      // TODO: Implementar endpoint DELETE
      // await api.delete(`/lancamentos/${confirmDeleteId}`)
      setToast({ message: 'Lançamento excluído com sucesso!', type: 'success' })
      loadLancamentos()
    } catch (error: any) {
      console.error('Erro ao excluir lançamento:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir lançamento', type: 'error' })
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  const handlePrint = (lancamento?: Lancamento) => {
    // TODO: Implementar impressão
    if (lancamento) {
      window.print()
    } else {
      // Imprimir todos
      window.print()
    }
  }

  const resetForm = () => {
    setFormData({
      supplierId: '',
      tipo: 'Despesa',
      marcador: '',
      dataVencimento: '',
      numeroDocumento: '',
      informarFinanceiro: false,
    })
    setLancamentoItems([])
    setSelectedSupplier(null)
    setSupplierSearch('')
    setEditingLancamento(null)
  }

  const openModal = () => {
    resetForm()
    setShowModal(true)
  }

  const { totalValor, totalCusto } = calculateTotals()

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pago_pela_loja': 'Pago pela loja',
      'pago_pelo_cliente': 'Pago pelo cliente',
      'aguardando_loja': 'Aguardando loja',
      'aguardando_cliente': 'Aguardando cliente',
      'garantia': 'Garantia',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    if (status === 'pago_pela_loja' || status === 'pago_pelo_cliente') {
      return 'bg-green-100 text-green-800'
    }
    if (status === 'aguardando_loja' || status === 'aguardando_cliente') {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (status === 'garantia') {
      return 'bg-blue-100 text-blue-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
            <p className="text-gray-600 mt-1">Gerencie lançamentos de serviços e despesas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePrint()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <FiPrinter />
              Imprimir Todos
            </button>
            <button
              onClick={openModal}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <FiPlus />
              Criar Lançamento
            </button>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 max-h-[calc(100vh-220px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Id</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marcador</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Custo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lancamentos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-3 text-center text-gray-500 text-sm">
                        Nenhum lançamento encontrado
                      </td>
                    </tr>
                  ) : (
                    lancamentos.map((lancamento) => (
                      <tr key={lancamento.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{lancamento.id}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          {lancamento.items?.[0]?.description || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {lancamento.items?.length > 1 
                            ? `${lancamento.items[0].description} e mais ${lancamento.items.length - 1}`
                            : lancamento.items?.[0]?.description || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {lancamento.supplier?.name || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {lancamento.usuario?.name || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {lancamento.marcador || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                            getStatusColor(lancamento.items?.[0]?.status || '')
                          }`}>
                            {getStatusLabel(lancamento.items?.[0]?.status || '')}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                          R$ {(lancamento.totalCusto || lancamento.items?.filter(item => item.addToCost).reduce((sum, item) => sum + (item.value || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          R$ {(lancamento.totalValor || lancamento.items?.reduce((sum, item) => sum + (item.value || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium space-x-1">
                          <button
                            onClick={() => handleView(lancamento)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visualizar"
                          >
                            <FiEye />
                          </button>
                          <button
                            onClick={() => handleEdit(lancamento)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Alterar"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(lancamento.id)}
                            disabled={deleting === lancamento.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Excluir"
                          >
                            {deleting === lancamento.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <FiTrash2 />
                            )}
                          </button>
                          <button
                            onClick={() => handlePrint(lancamento)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Imprimir"
                          >
                            <FiPrinter />
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

        {/* Modal Principal - Criar/Editar Lançamento */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold">
                    {editingLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Fornecedor */}
                  <div className="relative" ref={supplierDropdownRef}>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Fornecedor</label>
                    <input
                      ref={supplierSearchRef}
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => handleSupplierSearch(e.target.value)}
                      placeholder="Digite o nome do fornecedor"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                    {supplierSearch.length > 0 && supplierSearch.length < 3 && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Digite no mínimo 3 caracteres para localizar o fornecedor (nome ou CPF/CNPJ).
                      </p>
                    )}
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuppliers.map((supplier) => (
                          <div
                            key={supplier.id}
                            onClick={() => handleSelectSupplier(supplier)}
                            className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="font-medium text-sm text-gray-900">{supplier.name}</div>
                            {supplier.cpf && (
                              <div className="text-xs text-gray-500">
                                {supplier.pessoaType === 'Jurídica' ? 'CNPJ' : 'CPF'}: {supplier.pessoaType === 'Jurídica' ? formatCNPJ(supplier.cpf) : formatCPF(supplier.cpf)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo *</label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="Despesa">Despesa</option>
                      <option value="Receita">Receita</option>
                    </select>
                  </div>

                  {/* Marcador */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador Lançamento</label>
                    <input
                      type="text"
                      value={formData.marcador}
                      onChange={(e) => setFormData({ ...formData, marcador: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>

                  {/* Data de vencimento */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Data do vencimento *</label>
                    <input
                      type="date"
                      required
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>

                  {/* Nº documento */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº documento</label>
                    <input
                      type="text"
                      value={formData.numeroDocumento}
                      onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>

                  {/* Tabela de Lançamentos */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Lançamentos</label>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Data de serviço</th>
                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                            <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {lancamentoItems.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-2 py-2 text-center text-gray-500 text-xs">
                                Nenhum resultado encontrado.
                              </td>
                            </tr>
                          ) : (
                            lancamentoItems.map((item, index) => (
                              <tr key={index}>
                                <td className="px-2 py-1.5 text-xs text-gray-900">
                                  {new Date(item.serviceDate).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-2 py-1.5 text-xs text-gray-900">
                                  {item.vehicle 
                                    ? `${item.vehicle.brand} ${item.vehicle.model} ${item.vehicle.year}${item.vehicle.plate ? ` - ${item.vehicle.plate}` : ''}`
                                    : '-'}
                                </td>
                                <td className="px-2 py-1.5 text-xs text-gray-900">
                                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-2 py-1.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={2} className="px-2 py-1.5 text-right text-xs font-medium text-gray-900">
                              Total:
                            </td>
                            <td colSpan={2} className="px-2 py-1.5 text-xs font-medium text-gray-900">
                              R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddItemModal(true)}
                      className="mt-1.5 bg-primary-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5"
                    >
                      <FiPlus className="w-4 h-4" />
                      Adicionar lançamento
                    </button>
                  </div>

                  {/* Informar financeiro */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="informarFinanceiro"
                      checked={formData.informarFinanceiro}
                      onChange={(e) => setFormData({ ...formData, informarFinanceiro: e.target.checked })}
                      className="h-3.5 w-3.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="informarFinanceiro" className="ml-2 block text-xs text-gray-700">
                      Informar financeiro?
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        resetForm()
                      }}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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

        {/* Modal Adicionar Lançamento */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold">Incluir Lançamento</h2>
                  <button
                    onClick={() => {
                      setShowAddItemModal(false)
                      setCurrentItem({
                        description: '',
                        serviceDate: '',
                        status: '',
                        value: 0,
                        addToCost: false,
                      })
                      setVehicleSearch('')
                      setSelectedVehicle(null)
                      setCopyToNext(false)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Veículo */}
                  <div className="relative" ref={vehicleDropdownRef}>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo *</label>
                    <input
                      ref={vehicleSearchRef}
                      type="text"
                      value={vehicleSearch}
                      onChange={(e) => handleVehicleSearch(e.target.value)}
                      placeholder="Busque um veículo"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                    {showVehicleDropdown && filteredVehicles.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            onClick={() => handleSelectVehicle(vehicle)}
                            className="px-2 py-1.5 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="font-medium text-sm text-gray-900">
                              {vehicle.brand} {vehicle.model} {vehicle.year}
                            </div>
                            {vehicle.plate && (
                              <div className="text-xs text-gray-500">Placa: {vehicle.plate}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição *</label>
                    <input
                      type="text"
                      required
                      value={currentItem.description}
                      onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>

                  {/* Data do serviço */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Data do serviço *</label>
                    <input
                      type="date"
                      required
                      value={currentItem.serviceDate}
                      onChange={(e) => setCurrentItem({ ...currentItem, serviceDate: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Status *</label>
                    <select
                      required
                      value={currentItem.status}
                      onChange={(e) => setCurrentItem({ ...currentItem, status: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      <option value="pago_pela_loja">Pago pela loja</option>
                      <option value="pago_pelo_cliente">Pago pelo cliente</option>
                      <option value="aguardando_loja">Aguardando loja</option>
                      <option value="aguardando_cliente">Aguardando cliente</option>
                      <option value="garantia">Garantia</option>
                    </select>
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={currentItem.value || ''}
                      onChange={(e) => setCurrentItem({ ...currentItem, value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>

                  {/* Adicionar ao custo */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="addToCost"
                      checked={currentItem.addToCost || false}
                      onChange={(e) => setCurrentItem({ ...currentItem, addToCost: e.target.checked })}
                      className="h-3.5 w-3.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="addToCost" className="ml-2 block text-xs text-gray-700">
                      Adicionar ao custo?
                    </label>
                  </div>

                  {/* Copiar dados */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="copyToNext"
                      checked={copyToNext}
                      onChange={(e) => setCopyToNext(e.target.checked)}
                      className="h-3.5 w-3.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="copyToNext" className="ml-2 block text-xs text-gray-700">
                      Copiar dados para o próximo lançamento
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddItemModal(false)
                        setCurrentItem({
                          description: '',
                          serviceDate: '',
                          status: '',
                          value: 0,
                          addToCost: false,
                        })
                        setVehicleSearch('')
                        setSelectedVehicle(null)
                        setCopyToNext(false)
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visualizar */}
        {viewingLancamento && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Detalhes do Lançamento</h2>
                  <button
                    onClick={() => setViewingLancamento(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
                {/* TODO: Implementar visualização completa */}
                <div className="space-y-4">
                  <p><strong>Fornecedor:</strong> {viewingLancamento.supplier?.name || '-'}</p>
                  <p><strong>Tipo:</strong> {viewingLancamento.tipo}</p>
                  <p><strong>Data Vencimento:</strong> {new Date(viewingLancamento.dataVencimento).toLocaleDateString('pt-BR')}</p>
                  {/* Adicionar mais detalhes */}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este lançamento?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowConfirmModal(false)
          setConfirmDeleteId(null)
        }}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}

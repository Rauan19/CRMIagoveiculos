'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import ConfirmModal from '@/components/ConfirmModal'
import { formatPlate, removeMask } from '@/utils/formatters'

interface Customer {
  id: number
  name: string
  phone: string
}

interface Vehicle {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
  km?: number
  color?: string
  price?: number
  cost?: number
  tableValue?: number
  expenseType?: string
  expenseValue?: number
  customerId?: number
  customer?: Customer
  notes?: string
  photos?: string
  status: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  disponivel: 'bg-green-100 text-green-800',
  reservado: 'bg-yellow-100 text-yellow-800',
  vendido: 'bg-red-100 text-red-800',
}

interface FipeBrand {
  codigo: string
  nome: string
}

interface FipeModel {
  codigo: string
  nome: string
}

interface FipeYear {
  codigo: string
  nome: string
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  
  // Estados para FIPE
  const [vehicleType, setVehicleType] = useState<string>('carros') // 'carros', 'motos', 'caminhoes'
  const [fipeBrands, setFipeBrands] = useState<FipeBrand[]>([])
  const [fipeModels, setFipeModels] = useState<FipeModel[]>([])
  const [fipeYears, setFipeYears] = useState<FipeYear[]>([])
  const [selectedBrandCode, setSelectedBrandCode] = useState<string>('')
  const [selectedModelCode, setSelectedModelCode] = useState<string>('')
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [yearSearch, setYearSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    plate: '',
    km: '',
    color: '',
    price: '',
    cost: '',
    tableValue: '',
    expenseType: '',
    expenseValue: '',
    customerId: '',
    notes: '',
    status: 'disponivel',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (showModal) {
      loadFipeBrands()
    }
  }, [showModal])

  useEffect(() => {
    // Quando trocar o tipo de veículo, limpar tudo e recarregar marcas
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    if (showModal) {
      loadFipeBrands()
    }
  }, [vehicleType])

  useEffect(() => {
    if (selectedBrandCode) {
      loadFipeModels(selectedBrandCode)
    } else {
      setFipeModels([])
      setSelectedModelCode('')
      setFipeYears([])
    }
  }, [selectedBrandCode, vehicleType])

  useEffect(() => {
    if (selectedBrandCode && selectedModelCode) {
      loadFipeYears(selectedBrandCode, selectedModelCode)
    } else {
      setFipeYears([])
    }
  }, [selectedBrandCode, selectedModelCode, vehicleType])

  useEffect(() => {
    // Fechar dropdowns ao clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.searchable-select')) {
        setShowBrandDropdown(false)
        setShowModelDropdown(false)
        setShowYearDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadData = async () => {
    try {
      const [vehiclesRes, customersRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/customers'),
      ])
      setVehicles(vehiclesRes.data)
      setCustomers(customersRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFipeBrands = async () => {
    setLoadingBrands(true)
    try {
      const response = await api.get(`/fipe/brands?type=${vehicleType}`)
      setFipeBrands(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar marcas FIPE:', error)
      setFipeBrands([])
    } finally {
      setLoadingBrands(false)
    }
  }

  const loadFipeModels = async (brandCode: string) => {
    if (!brandCode) return
    setLoadingModels(true)
    try {
      const response = await api.get(`/fipe/brands/${brandCode}/models?type=${vehicleType}`)
      setFipeModels(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar modelos FIPE:', error)
      setFipeModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const loadFipeYears = async (brandCode: string, modelCode: string) => {
    if (!brandCode || !modelCode) return
    setLoadingYears(true)
    try {
      const response = await api.get(`/fipe/brands/${brandCode}/models/${modelCode}/years?type=${vehicleType}`)
      setFipeYears(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar anos FIPE:', error)
      setFipeYears([])
    } finally {
      setLoadingYears(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSend = {
        ...formData,
        plate: formData.plate ? removeMask(formData.plate) : '',
        customerId: formData.customerId || null,
        expenseType: formData.expenseType || null,
        expenseValue: formData.expenseValue || null,
        photos: null, // Upload de fotos removido - usar página /estoque
      }
      
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, dataToSend)
      } else {
        await api.post('/vehicles', dataToSend)
      }
      setShowModal(false)
      setEditingVehicle(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Erro ao salvar veículo:', error)
      alert('Erro ao salvar veículo')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year.toString(),
      plate: vehicle.plate ? formatPlate(vehicle.plate) : '',
      km: vehicle.km?.toString() || '',
      color: vehicle.color || '',
      price: vehicle.price?.toString() || '',
      cost: vehicle.cost?.toString() || '',
      tableValue: vehicle.tableValue?.toString() || '',
      expenseType: vehicle.expenseType || '',
      expenseValue: vehicle.expenseValue?.toString() || '',
      customerId: vehicle.customerId?.toString() || '',
      notes: vehicle.notes || '',
      status: vehicle.status,
    })
    setBrandSearch(vehicle.brand)
    setModelSearch(vehicle.model)
    setYearSearch(vehicle.year.toString())
    setSelectedBrandCode('') // Limpar código da marca ao editar (será buscado se necessário)
    setSelectedModelCode('') // Limpar código do modelo ao editar
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
      await api.delete(`/vehicles/${confirmDeleteId}`)
      loadData()
    } catch (error) {
      console.error('Erro ao excluir veículo:', error)
      alert('Erro ao excluir veículo')
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
      brand: '',
      model: '',
      year: '',
      plate: '',
      km: '',
      color: '',
      price: '',
      cost: '',
      tableValue: '',
      expenseType: '',
      expenseValue: '',
      customerId: '',
      notes: '',
      status: 'disponivel',
    })
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setShowBrandDropdown(false)
    setShowModelDropdown(false)
    setShowYearDropdown(false)
  }

  const handleBrandSelect = (brand: FipeBrand) => {
    setSelectedBrandCode(brand.codigo)
    setBrandSearch(brand.nome)
    setFormData({ ...formData, brand: brand.nome, model: '', year: '' }) // Limpar modelo e ano quando trocar marca
    setModelSearch('')
    setSelectedModelCode('')
    setYearSearch('')
    setShowBrandDropdown(false)
  }

  const handleModelSelect = (model: FipeModel) => {
    setSelectedModelCode(model.codigo)
    setFormData({ ...formData, model: model.nome, year: '' }) // Limpar ano quando trocar modelo
    setModelSearch(model.nome)
    setYearSearch('')
    setShowModelDropdown(false)
  }

  const handleYearSelect = (year: FipeYear) => {
    // Extrair apenas o ano (primeira parte antes de / ou -)
    const yearNumber = year.nome.split('/')[0]?.split('-')[0] || year.nome.split('-')[0] || year.nome
    setFormData({ ...formData, year: yearNumber })
    setYearSearch(year.nome) // Mostrar ano/ano modelo no input
    setShowYearDropdown(false)
  }

  const filteredBrands = fipeBrands.filter(brand =>
    brand.nome.toLowerCase().includes(brandSearch.toLowerCase())
  )

  const filteredModels = fipeModels.filter(model =>
    model.nome.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const filteredYears = fipeYears.filter(year =>
    year.nome.toLowerCase().includes(yearSearch.toLowerCase())
  )

  const openModal = () => {
    resetForm()
    setEditingVehicle(null)
    setShowModal(true)
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <button
            onClick={openModal}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
              Novo Veículo
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
                      Marca/Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Placa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Venda
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Compra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Tabela
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
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
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        Nenhum veículo cadastrado
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((vehicle) => (
                      <tr key={vehicle.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.brand} {vehicle.model}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.plate || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.price ? `R$ ${vehicle.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.cost ? `R$ ${vehicle.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.tableValue ? `R$ ${vehicle.tableValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.customer?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              statusColors[vehicle.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClick(vehicle.id)}
                            disabled={deleting === vehicle.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === vehicle.id ? 'Excluindo...' : 'Excluir'}
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
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Veículo *</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    >
                      <option value="carros">Carros</option>
                      <option value="motos">Motos</option>
                      <option value="caminhoes">Caminhões</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="searchable-select relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={brandSearch}
                          onChange={(e) => {
                            setBrandSearch(e.target.value)
                            setFormData({ ...formData, brand: e.target.value })
                            setShowBrandDropdown(true)
                          }}
                          onFocus={() => setShowBrandDropdown(true)}
                          placeholder="Digite para buscar marcas..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                        />
                        {showBrandDropdown && (loadingBrands || filteredBrands.length > 0 || brandSearch.length > 0) && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {loadingBrands ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">Carregando marcas...</div>
                            ) : filteredBrands.length > 0 ? (
                              filteredBrands.map((brand) => (
                                <button
                                  key={brand.codigo}
                                  type="button"
                                  onClick={() => handleBrandSelect(brand)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                >
                                  {brand.nome}
                                </button>
                              ))
                            ) : brandSearch.length > 0 ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">
                                Nenhuma marca encontrada. Você pode digitar livremente.
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="searchable-select relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={modelSearch}
                          onChange={(e) => {
                            setModelSearch(e.target.value)
                            setFormData({ ...formData, model: e.target.value })
                            setShowModelDropdown(true)
                          }}
                          onFocus={() => {
                            if (selectedBrandCode) {
                              setShowModelDropdown(true)
                            }
                          }}
                          disabled={!selectedBrandCode}
                          placeholder={selectedBrandCode ? "Digite para buscar modelos..." : "Selecione uma marca primeiro"}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {showModelDropdown && selectedBrandCode && (loadingModels || filteredModels.length > 0 || modelSearch.length > 0) && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {loadingModels ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">Carregando modelos...</div>
                            ) : filteredModels.length > 0 ? (
                              filteredModels.map((model) => (
                                <button
                                  key={model.codigo}
                                  type="button"
                                  onClick={() => handleModelSelect(model)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                >
                                  {model.nome}
                                </button>
                              ))
                            ) : modelSearch.length > 0 ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">
                                Nenhum modelo encontrado. Você pode digitar livremente.
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="searchable-select relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ano/Ano Modelo *</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={yearSearch}
                          onChange={(e) => {
                            setYearSearch(e.target.value)
                            // Se o usuário digitar apenas números, permitir entrada livre
                            const numericValue = e.target.value.replace(/[^0-9]/g, '')
                            if (numericValue) {
                              setFormData({ ...formData, year: numericValue })
                            }
                            setShowYearDropdown(true)
                          }}
                          onFocus={() => {
                            if (selectedBrandCode && selectedModelCode) {
                              setShowYearDropdown(true)
                            }
                          }}
                          disabled={!selectedBrandCode || !selectedModelCode}
                          placeholder={selectedBrandCode && selectedModelCode ? "Digite para buscar anos..." : "Selecione marca e modelo primeiro"}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {showYearDropdown && selectedBrandCode && selectedModelCode && (loadingYears || filteredYears.length > 0 || yearSearch.length > 0) && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {loadingYears ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">Carregando anos...</div>
                            ) : filteredYears.length > 0 ? (
                              filteredYears.map((year) => (
                                <button
                                  key={year.codigo}
                                  type="button"
                                  onClick={() => handleYearSelect(year)}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                >
                                  {year.nome}
                                </button>
                              ))
                            ) : yearSearch.length > 0 ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">
                                Nenhum ano encontrado. Você pode digitar livremente.
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                      <input
                        type="text"
                        maxLength={7}
                        value={formData.plate}
                        onChange={(e) => setFormData({ ...formData, plate: formatPlate(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="ABC1234"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Venda</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Preencha quando souber o valor"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor de Compra</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Preencha quando souber o valor"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Tabela (FIPE)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tableValue}
                        onChange={(e) => setFormData({ ...formData, tableValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Gasto</label>
                      <input
                        type="text"
                        value={formData.expenseType}
                        onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Ex: Pneu, Revisão, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Gasto</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.expenseValue}
                        onChange={(e) => setFormData({ ...formData, expenseValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Valor do gasto"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                      <select
                        value={formData.customerId}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="">Nenhum cliente</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      >
                        <option value="disponivel">Disponível</option>
                        <option value="reservado">Reservado</option>
                        <option value="vendido">Vendido</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Observações sobre o veículo"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingVehicle(null)
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

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este veículo?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}

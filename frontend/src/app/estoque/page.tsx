'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { formatPlate, removeMask, formatCPF, formatPhone, formatCNPJ, formatRG, formatCEP } from '@/utils/formatters'
import { FiPlus } from 'react-icons/fi'

interface Estoque {
  id: number
  brand: string
  model: string
  year: number
  plate?: string
  km?: number
  color?: string
  value?: number
  promotionValue?: number
  discount?: number
  notes?: string
  photos?: string
  totalSize?: number
  createdAt: string
}

interface StorageInfo {
  totalUsed: number
  totalUsedGB: number
  maxSize: number
  maxGB: number
  available: number
  availableGB: number
  percentageUsed: string
}

// Função para calcular tamanho de base64 em bytes (mesma lógica do backend)
function calculateBase64Size(base64String: string): number {
  if (!base64String) return 0
  const base64Data = base64String.includes(',') ? base64String.split(',')[1] : base64String
  return (base64Data.length * 3) / 4
}

// Função para calcular tamanho total de um array de imagens
function calculateTotalSize(photos: string[]): number {
  if (!photos || !Array.isArray(photos)) return 0
  return photos.reduce((total, photo) => total + calculateBase64Size(photo), 0)
}

export default function EstoquePage() {
  const [items, setItems] = useState<Estoque[]>([])
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Estoque | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([])
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    plate: '',
    km: '',
    color: '',
    value: '',
    promotionValue: '',
    discount: '',
    notes: '',
    photos: [] as string[],
  })
  const [currentPhotosSize, setCurrentPhotosSize] = useState(0)
  const [vehicleType, setVehicleType] = useState<string>('carros') // 'carros', 'motos', 'caminhoes'
  const [fipeBrands, setFipeBrands] = useState<{ codigo: string; nome: string }[]>([])
  const [fipeModels, setFipeModels] = useState<{ codigo: string; nome: string }[]>([])
  const [fipeYears, setFipeYears] = useState<{ codigo: string; nome: string }[]>([])
  const [selectedBrandCode, setSelectedBrandCode] = useState<string>('')
  const [selectedModelCode, setSelectedModelCode] = useState<string>('')
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [yearSearch, setYearSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)
  
  // Estados para saída de estoque
  const [showExitModal, setShowExitModal] = useState(false)
  const [exitingItem, setExitingItem] = useState<Estoque | null>(null)
  const [customers, setCustomers] = useState<{ id: number; name: string; cpf?: string; phone: string }[]>([])
  const [sellers, setSellers] = useState<{ id: number; name: string }[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<{ id: number; name: string; cpf?: string; phone: string }[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [exitFormData, setExitFormData] = useState({
    exitType: '', // 'transferencia', 'venda', 'pre_venda'
    saleType: '', // 'consumidor_final', 'repasse'
    exitDate: new Date().toISOString().split('T')[0],
    customerId: '',
    sellerId: '',
    tableValue: '',
    discount: '',
    saleValue: '',
    paymentMethods: [] as Array<{ 
      date: string; 
      type: string; 
      value: string;
      // Campos específicos para Financiamento Próprio
      valorFinanciado?: string;
      quantidadeParcelas?: string;
      frequencia15Dias?: boolean;
      manterDataFixa?: boolean;
      valorParcela?: string;
      numeroPrimeiroDoc?: string;
      numeroDocumento?: string;
      descricao?: string;
      avalista?: string;
      avalistaAdicional?: string;
    }>,
    transferStatus: 'pago', // 'pago', 'aberto', 'cortesia', 'cliente_vai_transferir', 'embutido_pagamentos'
    transferNotes: '',
    saleChannel: '',
    saleChannelNotes: '',
    contractNotes: '',
    internalNotes: '',
  })
  const [savingExit, setSavingExit] = useState(false)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [createCustomerActiveStep, setCreateCustomerActiveStep] = useState(1)
  const [newCustomerData, setNewCustomerData] = useState({
    pessoaType: 'Física' as 'Física' | 'Jurídica',
    cpf: '',
    name: '',
    apelido: '',
    rg: '',
    nomeMae: '',
    phone: '',
    email: '',
    facebook: '',
    instagram: '',
    website: '',
    nacionalidade: 'BRASILEIRA',
    naturalidade: '',
    birthDate: '',
    sexo: '',
    estadoCivil: '',
    profissao: '',
    cnh: '',
    cnhVencimento: '',
    cep: '',
    city: '',
    district: '',
    address: '',
    adicional: '',
    pendenciasFinanceiras: '',
    marcador: '',
    status: 'novo',
  })

  useEffect(() => {
    loadData()
    loadFipeBrands()
  }, [])

  // Quando trocar o tipo de veículo, recarregar marcas
  useEffect(() => {
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setFormData(prev => ({ ...prev, brand: '', model: '', year: '' }))
    loadFipeBrands()
  }, [vehicleType])

  // Quando selecionar uma marca, carregar modelos
  useEffect(() => {
    if (selectedBrandCode) {
      loadFipeModels(selectedBrandCode)
    } else {
      setFipeModels([])
      setSelectedModelCode('')
      setFipeYears([])
    }
  }, [selectedBrandCode, vehicleType])

  // Quando selecionar um modelo, carregar anos
  useEffect(() => {
    if (selectedBrandCode && selectedModelCode) {
      loadFipeYears(selectedBrandCode, selectedModelCode)
    } else {
      setFipeYears([])
    }
  }, [selectedBrandCode, selectedModelCode, vehicleType])

  useEffect(() => {
    // Recalcular tamanho das fotos quando mudar
    const totalSize = calculateTotalSize(formData.photos)
    setCurrentPhotosSize(totalSize)
  }, [formData.photos])

  const loadData = async () => {
    setLoading(true)
    try {
      const [estoqueRes, storageRes] = await Promise.all([
        api.get('/estoque'),
        api.get('/estoque/storage'),
      ])
      setItems(estoqueRes.data.items || [])
      setStorageInfo(estoqueRes.data.storage || storageRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setToast({ message: 'Erro ao carregar dados.', type: 'error' })
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
      setToast({ message: 'Erro ao carregar marcas da FIPE. Você ainda pode digitar a marca manualmente.', type: 'error' })
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

  // Filtrar marcas da FIPE pelo nome
  const filteredBrands = fipeBrands.filter(brand =>
    brand.nome.toLowerCase().includes(brandSearch.toLowerCase())
  )

  const filteredModels = fipeModels.filter(model =>
    model.nome.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const filteredYears = fipeYears.filter(year =>
    year.nome.toLowerCase().includes(yearSearch.toLowerCase())
  )

  const handleBrandSelect = (brand: { codigo: string; nome: string }) => {
    setSelectedBrandCode(brand.codigo)
    setBrandSearch(brand.nome)
    setFormData({ ...formData, brand: brand.nome, model: '', year: '' })
    setModelSearch('')
    setSelectedModelCode('')
    setYearSearch('')
    setShowBrandDropdown(false)
  }

  const handleModelSelect = (model: { codigo: string; nome: string }) => {
    setSelectedModelCode(model.codigo)
    setFormData({ ...formData, model: model.nome, year: '' })
    setModelSearch(model.nome)
    setYearSearch('')
    setShowModelDropdown(false)
  }

  const handleYearSelect = (year: { codigo: string; nome: string }) => {
    // Extrair apenas o ano (primeira parte antes de / ou -)
    const yearNumber = year.nome.split('/')[0]?.split('-')[0] || year.nome.split('-')[0] || year.nome
    setFormData({ ...formData, year: yearNumber })
    setYearSearch(year.nome)
    setShowYearDropdown(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const MAX_PHOTOS = 5
    const currentPhotoCount = formData.photos.length
    const filesToProcess = Array.from(files).slice(0, MAX_PHOTOS - currentPhotoCount)

    if (files.length > filesToProcess.length) {
      setToast({
        message: `Limite de ${MAX_PHOTOS} fotos por veículo. Apenas ${filesToProcess.length} foto(s) será(ão) adicionada(s).`,
        type: 'info'
      })
    }

    filesToProcess.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          const newPhotos = [...formData.photos, base64String]
          
          if (newPhotos.length > MAX_PHOTOS) {
            setToast({
              message: `Limite de ${MAX_PHOTOS} fotos por veículo atingido.`,
              type: 'error'
            })
            return
          }

          const newSize = calculateTotalSize(newPhotos)
          const availableSize = storageInfo ? storageInfo.available : 10 * 1024 * 1024 * 1024
          
          // Se estiver editando, precisa considerar o espaço que será liberado
          const editingItemSize = editingItem?.totalSize || 0
          const effectiveAvailable = editingItem 
            ? availableSize + editingItemSize 
            : availableSize

          if (newSize > effectiveAvailable) {
            const availableMB = (effectiveAvailable / (1024 * 1024)).toFixed(2)
            const neededMB = (newSize / (1024 * 1024)).toFixed(2)
            setToast({ 
              message: `Limite de armazenamento excedido! Disponível: ${availableMB}MB, Necessário: ${neededMB}MB. Limite máximo: 10GB`, 
              type: 'error' 
            })
            return
          }

          setFormData((prev) => ({
            ...prev,
            photos: newPhotos,
          }))
        }
        reader.readAsDataURL(file)
      }
    })
    
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const dataToSend = {
        brand: brandSearch.trim() || formData.brand.trim(),
        model: modelSearch.trim() || formData.model.trim(),
        year: parseInt(yearSearch || formData.year),
        plate: formData.plate ? removeMask(formData.plate) : null,
        km: formData.km ? parseInt(formData.km) : null,
        color: formData.color || null,
        value: formData.value ? parseFloat(formData.value) : null,
        promotionValue: formData.promotionValue ? parseFloat(formData.promotionValue) : null,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        notes: formData.notes || null,
        photos: formData.photos.length > 0 ? formData.photos : null,
      }
      
      if (editingItem) {
        await api.put(`/estoque/${editingItem.id}`, dataToSend)
        setToast({ message: 'Veículo atualizado com sucesso!', type: 'success' })
      } else {
        await api.post('/estoque', dataToSend)
        setToast({ message: 'Veículo adicionado ao estoque com sucesso!', type: 'success' })
      }
      setShowModal(false)
      setEditingItem(null)
      resetForm()
      await loadData()
    } catch (error: any) {
      console.error('Erro ao salvar veículo:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar veículo', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: Estoque) => {
    setEditingItem(item)
    let photos: string[] = []
    if (item.photos) {
      try {
        photos = typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos
      } catch {
        photos = []
      }
    }
    setFormData({
      brand: item.brand,
      model: item.model,
      year: item.year.toString(),
      plate: item.plate ? formatPlate(item.plate) : '',
      km: item.km?.toString() || '',
      color: item.color || '',
      value: item.value?.toString() || '',
      promotionValue: item.promotionValue?.toString() || '',
      discount: item.discount?.toString() || '',
      notes: item.notes || '',
      photos,
    })
    setBrandSearch(item.brand)
    setModelSearch(item.model)
    setYearSearch(item.year.toString())
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
      await api.delete(`/estoque/${confirmDeleteId}`)
      setToast({ message: 'Veículo removido do estoque com sucesso!', type: 'success' })
      await loadData()
    } catch (error: any) {
      console.error('Erro ao excluir veículo:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir veículo', type: 'error' })
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
      value: '',
      promotionValue: '',
      discount: '',
      notes: '',
      photos: [],
    })
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setCurrentPhotosSize(0)
  }

  // Funções para saída de estoque
  const loadCustomersAndSellers = async () => {
    try {
      const [customersRes, sellersRes] = await Promise.all([
        api.get('/customers'),
        api.get('/users/sellers'),
      ])
      setCustomers(customersRes.data || [])
      setSellers(sellersRes.data || [])
    } catch (error) {
      console.error('Erro ao carregar clientes e vendedores:', error)
    }
  }

  useEffect(() => {
    // Filtrar clientes quando a busca mudar
    if (customerSearch.length >= 3) {
      const filtered = customers.filter(customer => {
        const searchLower = customerSearch.toLowerCase()
        return (
          customer.name.toLowerCase().includes(searchLower) ||
          (customer.cpf && customer.cpf.includes(customerSearch)) ||
          customer.phone.includes(customerSearch)
        )
      })
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers([])
    }
  }, [customerSearch, customers])

  const handleExitStock = async (item: Estoque) => {
    setExitingItem(item)
    await loadCustomersAndSellers()
    setExitFormData({
      exitType: '',
      saleType: '',
      exitDate: new Date().toISOString().split('T')[0],
      customerId: '',
      sellerId: '',
      tableValue: item.value?.toString() || '',
      discount: item.discount?.toString() || '0',
      saleValue: item.promotionValue?.toString() || item.value?.toString() || '',
      paymentMethods: [],
      transferStatus: 'pago',
      transferNotes: '',
      saleChannel: '',
      saleChannelNotes: '',
      contractNotes: '',
      internalNotes: '',
    })
    setCustomerSearch('')
    setShowExitModal(true)
  }

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exitingItem) return

    setSavingExit(true)
    try {
      const dataToSend = {
        estoqueId: exitingItem.id,
        exitType: exitFormData.exitType,
        saleType: (exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') ? exitFormData.saleType : null,
        exitDate: exitFormData.exitDate,
        customerId: exitFormData.customerId ? parseInt(exitFormData.customerId) : null,
        sellerId: exitFormData.sellerId ? parseInt(exitFormData.sellerId) : null,
        tableValue: exitFormData.tableValue ? parseFloat(exitFormData.tableValue) : null,
        discount: exitFormData.discount ? parseFloat(exitFormData.discount) : 0,
        saleValue: exitFormData.saleValue ? parseFloat(exitFormData.saleValue) : null,
        paymentMethods: exitFormData.paymentMethods,
        transferStatus: exitFormData.exitType === 'transferencia' ? exitFormData.transferStatus : null,
        transferNotes: exitFormData.exitType === 'transferencia' ? exitFormData.transferNotes : null,
        saleChannel: (exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') ? exitFormData.saleChannel : null,
        saleChannelNotes: (exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') ? exitFormData.saleChannelNotes : null,
        contractNotes: (exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') ? exitFormData.contractNotes : null,
        internalNotes: exitFormData.internalNotes || null,
      }

      await api.post('/estoque/exit', dataToSend)
      setToast({ message: 'Saída de estoque registrada com sucesso!', type: 'success' })
      setShowExitModal(false)
      setExitingItem(null)
      await loadData()
    } catch (error: any) {
      console.error('Erro ao processar saída de estoque:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao processar saída de estoque', type: 'error' })
    } finally {
      setSavingExit(false)
    }
  }

  const addPaymentMethod = () => {
    setExitFormData({
      ...exitFormData,
      paymentMethods: [...exitFormData.paymentMethods, { 
        date: '', 
        type: '', 
        value: '',
        valorFinanciado: '',
        quantidadeParcelas: '',
        frequencia15Dias: false,
        manterDataFixa: false,
        valorParcela: '',
        numeroPrimeiroDoc: '',
        numeroDocumento: '',
        descricao: '',
        avalista: '',
        avalistaAdicional: ''
      }]
    })
  }

  const removePaymentMethod = (index: number) => {
    setExitFormData({
      ...exitFormData,
      paymentMethods: exitFormData.paymentMethods.filter((_, i) => i !== index)
    })
  }

  const updatePaymentMethod = (index: number, field: string, value: string | boolean) => {
    const updated = [...exitFormData.paymentMethods]
    updated[index] = { ...updated[index], [field]: value }
    setExitFormData({ ...exitFormData, paymentMethods: updated })
  }

  const calculateTotalReceivable = () => {
    return exitFormData.paymentMethods.reduce((total, pm) => {
      return total + (parseFloat(pm.value) || 0)
    }, 0)
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerData.name || !newCustomerData.phone || !newCustomerData.cpf) {
      setToast({ message: 'Nome, telefone e CPF/CNPJ são obrigatórios', type: 'error' })
      return
    }

    setCreatingCustomer(true)
    try {
      const dataToSend = {
        ...newCustomerData,
        cpf: removeMask(newCustomerData.cpf),
        phone: removeMask(newCustomerData.phone),
        cep: newCustomerData.cep ? removeMask(newCustomerData.cep) : '',
        rg: newCustomerData.rg ? removeMask(newCustomerData.rg) : '',
        cnh: newCustomerData.cnh || '',
        birthDate: newCustomerData.birthDate || null,
        cnhVencimento: newCustomerData.cnhVencimento || null,
      }

      const response = await api.post('/customers', dataToSend)
      const newCustomer = response.data.customer || response.data

      // Atualizar lista de clientes
      await loadCustomersAndSellers()

      // Selecionar o cliente recém-criado
      setExitFormData({ ...exitFormData, customerId: newCustomer.id.toString() })
      setCustomerSearch(`${newCustomer.name} ${newCustomer.cpf || newCustomer.phone}`)
      setShowCreateCustomerModal(false)
      setCreateCustomerActiveStep(1)
      setNewCustomerData({
        pessoaType: 'Física',
        cpf: '',
        name: '',
        apelido: '',
        rg: '',
        nomeMae: '',
        phone: '',
        email: '',
        facebook: '',
        instagram: '',
        website: '',
        nacionalidade: 'BRASILEIRA',
        naturalidade: '',
        birthDate: '',
        sexo: '',
        estadoCivil: '',
        profissao: '',
        cnh: '',
        cnhVencimento: '',
        cep: '',
        city: '',
        district: '',
        address: '',
        adicional: '',
        pendenciasFinanceiras: '',
        marcador: '',
        status: 'novo',
      })
      setToast({ message: 'Cliente criado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao criar cliente', type: 'error' })
    } finally {
      setCreatingCustomer(false)
    }
  }

  const openModal = () => {
    resetForm()
    setEditingItem(null)
    setShowModal(true)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gerencie itens do estoque com valores, descontos e imagens. Limite de armazenamento: 10GB
            </p>
          </div>
          <button
            onClick={openModal}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
          >
            Adicionar Veículo
          </button>
        </div>

        {/* Info de Armazenamento */}
        {storageInfo && (
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Armazenamento</h3>
              <span className="text-sm font-bold text-gray-900">
                {storageInfo.totalUsedGB.toFixed(2)} GB / {storageInfo.maxGB.toFixed(2)} GB
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  parseFloat(storageInfo.percentageUsed) > 90 
                    ? 'bg-red-500' 
                    : parseFloat(storageInfo.percentageUsed) > 70 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${storageInfo.percentageUsed}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              Disponível: {storageInfo.availableGB.toFixed(2)} GB ({storageInfo.percentageUsed}% usado)
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden max-h-[calc(100vh-320px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veículo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Placa / Cor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Desconto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Final
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fotos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Nenhum veículo no estoque. Clique em "Adicionar Veículo" para começar.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const photos = item.photos 
                        ? (typeof item.photos === 'string' ? JSON.parse(item.photos) : item.photos)
                        : []
                      // Se houver promotionValue, usar ele como valor final
                      // Caso contrário, calcular com desconto se houver
                      const finalValue = item.promotionValue 
                        ? item.promotionValue
                        : item.value && item.discount 
                        ? item.value - (item.value * item.discount / 100)
                        : item.value

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.brand} {item.model}</div>
                            <div className="text-xs text-gray-500">{item.year}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {item.plate ? `Placa: ${item.plate}` : '-'}
                            </div>
                            {item.color && (
                              <div className="text-xs text-gray-400">{item.color}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.value ? `R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.discount ? `${item.discount}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {item.promotionValue && item.value ? (
                              <div>
                                <div className="text-gray-500 line-through text-xs">
                                  De R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-green-600">
                                  Por R$ {item.promotionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ) : finalValue ? (
                              `R$ ${finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {photos.length > 0 ? (
                              <button
                                onClick={() => {
                                  setViewingPhotos(photos)
                                  setCurrentPhotoIndex(0)
                                  setShowPhotoModal(true)
                                }}
                                className="hover:underline cursor-pointer"
                              >
                                <span className="text-gray-900">{photos.length} foto(s)</span>
                                {' '}
                                <span className="text-primary-600 hover:text-primary-800">- Ver</span>
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleExitStock(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Saída de Estoque
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id)}
                              disabled={deleting === item.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deleting === item.id ? 'Excluindo...' : 'Excluir'}
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
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingItem ? 'Editar Veículo' : 'Adicionar Veículo ao Estoque'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
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
                          placeholder="Digite para buscar marcas da FIPE ou digite uma marca personalizada..."
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                        {loadingModels && (
                          <div className="absolute right-3 top-2.5">
                            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                        />
                        {loadingYears && (
                          <div className="absolute right-3 top-2.5">
                            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          </div>
                        )}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Preencha quando souber o valor"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Promoção</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.promotionValue}
                        onChange={(e) => setFormData({ ...formData, promotionValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="Valor promocional (opcional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Desconto (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        placeholder="0"
                      />
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

                  {/* Upload de Fotos */}
                  <div className="col-span-2 border-t pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fotos do Veículo
                      <span className="text-xs text-gray-500 ml-2">
                        ({formData.photos.length}/5)
                      </span>
                      {currentPhotosSize > 0 && (
                        <span className="text-xs text-gray-500 ml-2">
                          (Tamanho: {formatBytes(currentPhotosSize)})
                        </span>
                      )}
                    </label>
                    <div className="space-y-4">
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                          disabled={formData.photos.length >= 5}
                        />
                        <label
                          htmlFor="image-upload"
                          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 transition-colors ${
                            formData.photos.length >= 5
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:bg-gray-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formData.photos.length >= 5 ? 'Limite de 5 fotos atingido' : 'Adicionar Fotos'}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Máximo de 5 fotos por veículo. Limite de armazenamento: 10GB total
                        </p>
                      </div>
                      
                      {formData.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {formData.photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingItem(null)
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
      {/* Modal de Visualização de Fotos */}
      {showPhotoModal && viewingPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Fotos do Veículo ({currentPhotoIndex + 1}/{viewingPhotos.length})
              </h2>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 relative">
              <img
                src={viewingPhotos[currentPhotoIndex]}
                alt={`Foto ${currentPhotoIndex + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
              {viewingPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : viewingPhotos.length - 1))}
                    className="absolute left-4 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPhotoIndex((prev) => (prev < viewingPhotos.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            {viewingPhotos.length > 1 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2 justify-center overflow-x-auto">
                  {viewingPhotos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        index === currentPhotoIndex ? 'border-primary-600' : 'border-gray-300'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Saída de Estoque */}
      {showExitModal && exitingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-bold mb-3">Incluir Saída</h2>
              <form onSubmit={handleExitSubmit} className="space-y-3">
                {/* Veículo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Veículo</label>
                  <div className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900">
                    {exitingItem.brand} {exitingItem.model} {exitingItem.year} {exitingItem.plate ? `- ${exitingItem.plate}` : ''}
                  </div>
                </div>

                {/* Tipo de saída */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de saída *</label>
                  <select
                    required
                    value={exitFormData.exitType}
                    onChange={(e) => setExitFormData({ ...exitFormData, exitType: e.target.value, saleType: '' })}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    <option value="transferencia">Transferência</option>
                    <option value="venda">Venda</option>
                    <option value="pre_venda">Pré-venda</option>
                  </select>
                </div>

                {/* Tipo de venda (se for venda ou pré-venda) */}
                {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo de venda *</label>
                    <select
                      required
                      value={exitFormData.saleType}
                      onChange={(e) => setExitFormData({ ...exitFormData, saleType: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      <option value="consumidor_final">Consumidor Final</option>
                      <option value="repasse">Repasse</option>
                    </select>
                  </div>
                )}

                {/* Dados de Saída */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-900 mb-2">Dados de Saída</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de saída *</label>
                      <input
                        type="date"
                        required
                        value={exitFormData.exitDate}
                        onChange={(e) => setExitFormData({ ...exitFormData, exitDate: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      />
                    </div>
                    {exitFormData.exitType !== 'transferencia' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Cliente *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              required
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
                              placeholder="Digite no mínimo 3 caracteres para localizar o cliente (nome ou CPF)"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                            {showCustomerDropdown && filteredCustomers.length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredCustomers.map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      setExitFormData({ ...exitFormData, customerId: customer.id.toString() })
                                      setCustomerSearch(`${customer.name} ${customer.cpf || customer.phone}`)
                                      setShowCustomerDropdown(false)
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCreateCustomerModal(true)}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                            title="Criar novo cliente"
                          >
                            <FiPlus className="w-3 h-3" />
                            Criar
                          </button>
                        </div>
                      </div>
                    )}
                    {exitFormData.exitType === 'transferencia' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Cliente</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
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
                              placeholder="Digite no mínimo 3 caracteres para localizar o cliente (nome ou CPF)"
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                            {showCustomerDropdown && filteredCustomers.length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredCustomers.map((customer) => (
                                  <button
                                    key={customer.id}
                                    type="button"
                                    onClick={() => {
                                      setExitFormData({ ...exitFormData, customerId: customer.id.toString() })
                                      setCustomerSearch(`${customer.name} ${customer.cpf || customer.phone}`)
                                      setShowCustomerDropdown(false)
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                                  >
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.cpf || customer.phone}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCreateCustomerModal(true)}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1 whitespace-nowrap"
                            title="Criar novo cliente"
                          >
                            <FiPlus className="w-3 h-3" />
                            Criar
                          </button>
                        </div>
                      </div>
                    )}
                    {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Vendedor *</label>
                        <select
                          required
                          value={exitFormData.sellerId}
                          onChange={(e) => setExitFormData({ ...exitFormData, sellerId: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          {sellers.map((seller) => (
                            <option key={seller.id} value={seller.id}>
                              {seller.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Valor da venda e formas de pagamento */}
                {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Valor da venda e formas de pagamento</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor de tabela</label>
                        <input
                          type="number"
                          step="0.01"
                          value={exitFormData.tableValue}
                          onChange={(e) => setExitFormData({ ...exitFormData, tableValue: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor de desconto</label>
                        <input
                          type="number"
                          step="0.01"
                          value={exitFormData.discount}
                          onChange={(e) => setExitFormData({ ...exitFormData, discount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor da venda *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={exitFormData.saleValue}
                          onChange={(e) => setExitFormData({ ...exitFormData, saleValue: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Formas de pagamento */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium text-gray-700">Inclusão de formas de pagamento *</label>
                        <button
                          type="button"
                          onClick={addPaymentMethod}
                          className="text-xs text-primary-600 hover:text-primary-800"
                        >
                          + Adicionar
                        </button>
                      </div>
                      {exitFormData.paymentMethods.length === 0 ? (
                        <div className="text-xs text-gray-500 py-3 text-center border border-gray-200 rounded">
                          Nenhum resultado encontrado.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Tipo de pagamento</th>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {exitFormData.paymentMethods.map((pm, index) => (
                                <>
                                  <tr key={index}>
                                    <td className="px-2 py-1">
                                      <input
                                        type="date"
                                        required
                                        value={pm.date}
                                        onChange={(e) => updatePaymentMethod(index, 'date', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <select
                                        required
                                        value={pm.type}
                                        onChange={(e) => updatePaymentMethod(index, 'type', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      >
                                        <option value="">Selecione</option>
                                        <option value="carta_credito_consorcio">Carta de crédito de consórcio</option>
                                        <option value="carta_credito">Cartão de crédito</option>
                                        <option value="cartao_debito">Cartão de débito</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="consorcio">Consórcio</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="financiamento">Financiamento</option>
                                        <option value="financiamento_proprio">Financiamento Próprio (Duplicatas, promissórias, carnê, etc)</option>
                                        <option value="outros">Outros (Terrenos, permutas, etc. Não gera contas a receber)</option>
                                        <option value="sinal_negocio">Sinal de negócio</option>
                                        <option value="ted_doc_pix">TED, DOC, PIX, Transferência bancária</option>
                                        <option value="troco_troca">Troco na troca</option>
                                        <option value="veiculo_troca">Veículo na troca</option>
                                        <option value="boleto">Boleto</option>
                                      </select>
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={pm.value}
                                        onChange={(e) => updatePaymentMethod(index, 'value', e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <button
                                        type="button"
                                        onClick={() => removePaymentMethod(index)}
                                        className="text-red-600 hover:text-red-800 text-xs"
                                      >
                                        Remover
                                      </button>
                                    </td>
                                  </tr>
                                  {/* Campos específicos para Financiamento Próprio */}
                                  {pm.type === 'financiamento_proprio' && (
                                    <tr key={`${index}-details`} className="bg-gray-50">
                                      <td colSpan={4} className="px-2 py-2">
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor financiado *</label>
                                              <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={pm.valorFinanciado || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'valorFinanciado', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Quantidade de parcelas *</label>
                                              <select
                                                required
                                                value={pm.quantidadeParcelas || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'quantidadeParcelas', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              >
                                                <option value="">Selecione</option>
                                                {Array.from({ length: 60 }, (_, i) => i + 1).map(num => (
                                                  <option key={num} value={num.toString()}>{num}</option>
                                                ))}
                                              </select>
                                            </div>
                                            <div className="col-span-2 flex gap-4 items-center">
                                              <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={pm.frequencia15Dias || false}
                                                  onChange={(e) => updatePaymentMethod(index, 'frequencia15Dias', e.target.checked)}
                                                  className="rounded border-gray-300"
                                                />
                                                <span className="text-xs text-gray-700">Parcelas com frequência de 15 dias</span>
                                              </label>
                                              <label className="flex items-center gap-1 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={pm.manterDataFixa || false}
                                                  onChange={(e) => updatePaymentMethod(index, 'manterDataFixa', e.target.checked)}
                                                  className="rounded border-gray-300"
                                                />
                                                <span className="text-xs text-gray-700">Manter data fixa</span>
                                              </label>
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Valor da parcela</label>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={pm.valorParcela || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'valorParcela', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Número do 1º Doc</label>
                                              <input
                                                type="text"
                                                value={pm.numeroPrimeiroDoc || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'numeroPrimeiroDoc', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Nº documento</label>
                                              <input
                                                type="text"
                                                value={pm.numeroDocumento || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'numeroDocumento', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Descrição</label>
                                              <input
                                                type="text"
                                                value={pm.descricao || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'descricao', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Avalista</label>
                                              <input
                                                type="text"
                                                value={pm.avalista || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'avalista', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-xs font-medium text-gray-700 mb-0.5">Avalista adicional</label>
                                              <input
                                                type="text"
                                                value={pm.avalistaAdicional || ''}
                                                onChange={(e) => updatePaymentMethod(index, 'avalistaAdicional', e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              ))}
                            </tbody>
                          </table>
                          <div className="text-xs font-medium text-gray-700 mt-2">
                            A Receber: R$ {calculateTotalReceivable().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transferência de documentos */}
                {(exitFormData.exitType === 'transferencia' || exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">
                      Transferência de documentos
                      <span className="text-xs text-gray-500 ml-2">💡 Informe abaixo como será feita a transferência desse veículo conforme as opções disponíveis.</span>
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Status Transferência</label>
                        <select
                          value={exitFormData.transferStatus}
                          onChange={(e) => setExitFormData({ ...exitFormData, transferStatus: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="pago">Pago</option>
                          <option value="aberto">Aberto</option>
                          <option value="cortesia">Cortesia</option>
                          <option value="cliente_vai_transferir">Cliente vai transferir</option>
                          <option value="embutido_pagamentos">Embutido nos pagamentos do veículo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações da transferência</label>
                        <textarea
                          value={exitFormData.transferNotes}
                          onChange={(e) => setExitFormData({ ...exitFormData, transferNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Outras Informações */}
                {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda' || exitFormData.exitType === 'transferencia') && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 mb-2">Outras Informações</h3>
                    <div className="space-y-2">
                      {(exitFormData.exitType === 'venda' || exitFormData.exitType === 'pre_venda') && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Canal Venda *</label>
                            <select
                              required
                              value={exitFormData.saleChannel}
                              onChange={(e) => setExitFormData({ ...exitFormData, saleChannel: e.target.value })}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            >
                              <option value="">Selecione</option>
                              <option value="anuncio_em_jornal">ANUNCIO EM JORNAL</option>
                              <option value="feirao">FEIRÃO</option>
                              <option value="indicacao_de_amigo">INDICAÇÃO DE AMIGO</option>
                              <option value="indicacao_de_funcionario">INDICAÇÃO DE FUNCIONARIO</option>
                              <option value="internet">INTERNET</option>
                              <option value="meu_carro_novo">MEU CARRO NOVO</option>
                              <option value="news_letter">NEWS LETTER</option>
                              <option value="outro">OUTRO</option>
                              <option value="panfleto">PANFLETO</option>
                              <option value="por_telefone">POR TELEFONE</option>
                              <option value="televisao">TELEVISÃO</option>
                              <option value="visita_a_loja">VISITA A LOJA</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Obs Canal Venda</label>
                            <textarea
                              value={exitFormData.saleChannelNotes}
                              onChange={(e) => setExitFormData({ ...exitFormData, saleChannelNotes: e.target.value })}
                              rows={2}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">
                              Observações do contrato
                              <span className="text-xs text-gray-500 ml-2">Atenção, este campo aparece nos contratos.</span>
                            </label>
                            <textarea
                              value={exitFormData.contractNotes}
                              onChange={(e) => setExitFormData({ ...exitFormData, contractNotes: e.target.value })}
                              rows={2}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Observações internas</label>
                        <textarea
                          value={exitFormData.internalNotes}
                          onChange={(e) => setExitFormData({ ...exitFormData, internalNotes: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExitModal(false)
                      setExitingItem(null)
                      setCustomerSearch('')
                    }}
                    disabled={savingExit}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingExit}
                    className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {savingExit ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </>
                    ) : (
                      'Confirmar Saída'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Cliente */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold">Criar Novo Cliente</h2>
            </div>
            
            {/* Navegação de Etapas */}
            <div className="px-4 pt-4 border-b border-gray-200">
              <div className="flex gap-2 overflow-x-auto">
                {[
                  { id: 1, label: 'Dados Básicos' },
                  { id: 2, label: 'Contato' },
                  { id: 3, label: 'Dados Pessoais' },
                  { id: 4, label: 'CNH' },
                  { id: 5, label: 'Endereço' },
                  { id: 6, label: 'Adicional' }
                ].map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCreateCustomerActiveStep(step.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      createCustomerActiveStep === step.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto">
              <div className="p-3">
                {/* Etapa 1: Dados Básicos */}
                {createCustomerActiveStep === 1 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Pessoa *</label>
                        <select
                          required
                          value={newCustomerData.pessoaType}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, pessoaType: e.target.value as 'Física' | 'Jurídica', cpf: '' })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="Física">Física</option>
                          <option value="Jurídica">Jurídica</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">
                          {newCustomerData.pessoaType === 'Jurídica' ? 'CNPJ *' : 'CPF *'}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={newCustomerData.pessoaType === 'Jurídica' ? 18 : 14}
                          value={newCustomerData.cpf}
                          onChange={(e) => {
                            const formatted = newCustomerData.pessoaType === 'Jurídica' 
                              ? formatCNPJ(e.target.value)
                              : formatCPF(e.target.value)
                            setNewCustomerData({ ...newCustomerData, cpf: formatted })
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder={newCustomerData.pessoaType === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={newCustomerData.name}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Apelido</label>
                        <input
                          type="text"
                          value={newCustomerData.apelido}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, apelido: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">RG</label>
                        <input
                          type="text"
                          maxLength={12}
                          value={newCustomerData.rg}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, rg: formatRG(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="00.000.000-0"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Nome da Mãe</label>
                        <input
                          type="text"
                          value={newCustomerData.nomeMae}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, nomeMae: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Etapa 2: Contato */}
                {createCustomerActiveStep === 2 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Telefone *</label>
                        <input
                          type="text"
                          required
                          maxLength={15}
                          value={newCustomerData.phone}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: formatPhone(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Email</label>
                        <input
                          type="email"
                          value={newCustomerData.email}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Facebook</label>
                        <input
                          type="text"
                          value={newCustomerData.facebook}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, facebook: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="URL ou nome de usuário"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Instagram</label>
                        <input
                          type="text"
                          value={newCustomerData.instagram}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, instagram: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="@usuario"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Website</label>
                        <input
                          type="url"
                          value={newCustomerData.website}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, website: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Etapa 3: Dados Pessoais */}
                {createCustomerActiveStep === 3 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Nacionalidade</label>
                        <input
                          type="text"
                          value={newCustomerData.nacionalidade}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, nacionalidade: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="BRASILEIRA"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Naturalidade</label>
                        <input
                          type="text"
                          value={newCustomerData.naturalidade}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, naturalidade: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Cidade/Estado"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Data de Nascimento</label>
                        <input
                          type="date"
                          value={newCustomerData.birthDate}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, birthDate: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Sexo</label>
                        <select
                          value={newCustomerData.sexo}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, sexo: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Estado Civil</label>
                        <select
                          value={newCustomerData.estadoCivil}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, estadoCivil: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="">Selecione</option>
                          <option value="Solteiro">Solteiro</option>
                          <option value="Casado">Casado</option>
                          <option value="Divorciado">Divorciado</option>
                          <option value="Viúvo">Viúvo</option>
                          <option value="União Estável">União Estável</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Profissão</label>
                        <input
                          type="text"
                          value={newCustomerData.profissao}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, profissao: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Etapa 4: CNH */}
                {createCustomerActiveStep === 4 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">CNH</label>
                        <input
                          type="text"
                          value={newCustomerData.cnh}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, cnh: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Número da CNH"
                          maxLength={11}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Data Vencimento CNH</label>
                        <input
                          type="date"
                          value={newCustomerData.cnhVencimento}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, cnhVencimento: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Etapa 5: Endereço */}
                {createCustomerActiveStep === 5 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">CEP</label>
                        <input
                          type="text"
                          maxLength={9}
                          value={newCustomerData.cep}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, cep: formatCEP(e.target.value) })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="00000-000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Cidade</label>
                        <input
                          type="text"
                          value={newCustomerData.city}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Bairro</label>
                        <input
                          type="text"
                          value={newCustomerData.district}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, district: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Endereço</label>
                        <input
                          type="text"
                          value={newCustomerData.address}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Etapa 6: Adicional */}
                {createCustomerActiveStep === 6 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Adicional</label>
                        <textarea
                          value={newCustomerData.adicional}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, adicional: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          rows={2}
                          placeholder="Informações adicionais..."
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Pendências Financeiras</label>
                        <textarea
                          value={newCustomerData.pendenciasFinanceiras}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, pendenciasFinanceiras: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          rows={2}
                          placeholder="Descreva pendências financeiras..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador</label>
                        <input
                          type="text"
                          value={newCustomerData.marcador}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, marcador: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          placeholder="Tag/Marcador"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-0.5">Status</label>
                        <select
                          value={newCustomerData.status}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, status: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                        >
                          <option value="novo">Novo</option>
                          <option value="negociacao">Negociação</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Navegação */}
              <div className="p-3 border-t border-gray-200 flex justify-between items-center">
                <div className="flex gap-2">
                  {createCustomerActiveStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCreateCustomerActiveStep(createCustomerActiveStep - 1)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Anterior
                    </button>
                  )}
                  {createCustomerActiveStep < 6 && (
                    <button
                      type="button"
                      onClick={() => setCreateCustomerActiveStep(createCustomerActiveStep + 1)}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Próximo
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCustomerModal(false)
                      setCreateCustomerActiveStep(1)
                      setNewCustomerData({
                        pessoaType: 'Física',
                        cpf: '',
                        name: '',
                        apelido: '',
                        rg: '',
                        nomeMae: '',
                        phone: '',
                        email: '',
                        facebook: '',
                        instagram: '',
                        website: '',
                        nacionalidade: 'BRASILEIRA',
                        naturalidade: '',
                        birthDate: '',
                        sexo: '',
                        estadoCivil: '',
                        profissao: '',
                        cnh: '',
                        cnhVencimento: '',
                        cep: '',
                        city: '',
                        district: '',
                        address: '',
                        adicional: '',
                        pendenciasFinanceiras: '',
                        marcador: '',
                        status: 'novo',
                      })
                    }}
                    disabled={creatingCustomer}
                    className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCustomer}
                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {creatingCustomer ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Criando...
                      </>
                    ) : (
                      'Criar Cliente'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este veículo do estoque?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}



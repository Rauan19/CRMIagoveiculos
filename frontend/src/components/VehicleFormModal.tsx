'use client'

import { useRef, useState, useEffect } from 'react'
import api from '@/services/api'
import { formatPlate, removeMask } from '@/utils/formatters'
import {
  ESPECIES,
  COMBUSTIVEIS,
  PORTAS,
  CAMBIOS,
  BLINDADO,
  ORIGEM,
  PERICIA_CAUTELAR,
  OPCIONAIS_LIST,
} from '@/utils/vehicleOptions'
import { FiFileText, FiUpload, FiX, FiImage } from 'react-icons/fi'

export interface VehicleFormModalVehicle {
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
  status: string
  [key: string]: unknown
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

interface CustomerOption {
  id: number
  name: string
  phone: string
}

interface VehicleFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: (vehicle: VehicleFormModalVehicle) => void
  editingVehicle?: VehicleFormModalVehicle | null
}

const initialFormData = {
  empresa: 'Iago Veiculos Ltda',
  posicao: '',
  conditionStatus: 'usado',
  plate: '',
  renavam: '',
  cadastroOutrasLojas: false,
  especie: 'AUTOMÓVEL',
  combustivel: '',
  brand: '',
  model: '',
  color: '',
  modeloDenatran: '',
  km: '',
  modeloBase: '',
  portas: '',
  carroceria: '',
  anoFabricacao: '',
  anoModelo: '',
  year: '',
  motorizacao: '',
  cambio: '',
  chassi: '',
  chassiRemarcado: false,
  modeloFipe: '',
  cidadeEmplacamento: '',
  numeroCambio: '',
  hpCv: '',
  periciaCautelar: '',
  passageiros: '',
  blindado: 'Não',
  origem: 'Nacional',
  numeroMotor: '',
  corInterna: '',
  price: '',
  cost: '',
  tableValue: '',
  expenseType: '',
  expenseValue: '',
  customerId: '',
  notes: '',
  status: 'disponivel',
  opcionais: [] as string[],
  photos: [] as string[],
}

const MAX_PHOTOS = 3

export default function VehicleFormModal({
  open,
  onClose,
  onSuccess,
  editingVehicle = null,
}: VehicleFormModalProps) {
  const docInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const [activeStep, setActiveStep] = useState(1)
  const [vehicleType, setVehicleType] = useState('carros')
  const [fipeBrands, setFipeBrands] = useState<FipeBrand[]>([])
  const [fipeModels, setFipeModels] = useState<FipeModel[]>([])
  const [fipeYears, setFipeYears] = useState<FipeYear[]>([])
  const [selectedBrandCode, setSelectedBrandCode] = useState('')
  const [selectedModelCode, setSelectedModelCode] = useState('')
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [yearSearch, setYearSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [opcionaisSearch, setOpcionaisSearch] = useState('')
  const [vehicleDocumentFile, setVehicleDocumentFile] = useState<File | null>(null)
  const [isDraggingDoc, setIsDraggingDoc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])

  const loadFipeBrands = async () => {
    setLoadingBrands(true)
    try {
      const response = await api.get(`/fipe/brands?type=${vehicleType}`)
      setFipeBrands(response.data || [])
    } catch {
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
    } catch {
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
    } catch {
      setFipeYears([])
    } finally {
      setLoadingYears(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setActiveStep(1)
    setFormData({ ...initialFormData })
    setVehicleDocumentFile(null)
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    setFipeModels([])
    setFipeYears([])
    if (editingVehicle) {
      const v = editingVehicle as Record<string, unknown>
      let photos: string[] = []
      if (v.photos) {
        try {
          photos = Array.isArray(v.photos) ? (v.photos as string[]) : []
        } catch {}
      }
      let opcionais: string[] = []
      if (v.opcionais) {
        try {
          opcionais = typeof v.opcionais === 'string' ? JSON.parse(v.opcionais) : (v.opcionais as string[])
        } catch {}
        if (!Array.isArray(opcionais)) opcionais = []
      }
      setFormData({
        empresa: (v.empresa as string) || 'Iago Veiculos Ltda',
        posicao: (v.posicao as number)?.toString() || '',
        conditionStatus: (v.conditionStatus as string) || 'usado',
        plate: editingVehicle.plate ? formatPlate(editingVehicle.plate) : '',
        renavam: (v.renavam as string) || '',
        cadastroOutrasLojas: !!(v.cadastroOutrasLojas as boolean),
        especie: (v.especie as string) || 'AUTOMÓVEL',
        combustivel: (v.combustivel as string) || '',
        brand: editingVehicle.brand,
        model: editingVehicle.model,
        color: (editingVehicle.color as string) || '',
        modeloDenatran: (v.modeloDenatran as string) || '',
        km: (editingVehicle.km as number)?.toString() || '',
        modeloBase: (v.modeloBase as string) || '',
        portas: (v.portas as string) || '',
        carroceria: (v.carroceria as string) || '',
        anoFabricacao: (v.anoFabricacao as number)?.toString() || '',
        anoModelo: (v.anoModelo as number)?.toString() || '',
        year: editingVehicle.year.toString(),
        motorizacao: (v.motorizacao as string) || '',
        cambio: (v.cambio as string) || '',
        chassi: (v.chassi as string) || '',
        chassiRemarcado: !!(v.chassiRemarcado as boolean),
        modeloFipe: (v.modeloFipe as string) || '',
        cidadeEmplacamento: (v.cidadeEmplacamento as string) || '',
        numeroCambio: (v.numeroCambio as string) || '',
        hpCv: (v.hpCv as string) || '',
        periciaCautelar: (v.periciaCautelar as string) || '',
        passageiros: (v.passageiros as string) || '',
        blindado: (v.blindado as string) || 'Não',
        origem: (v.origem as string) || 'Nacional',
        numeroMotor: (v.numeroMotor as string) || '',
        corInterna: (v.corInterna as string) || '',
        price: (editingVehicle.price as number)?.toString() || '',
        cost: (editingVehicle.cost as number)?.toString() || '',
        tableValue: (editingVehicle.tableValue as number)?.toString() || '',
        expenseType: (v.expenseType as string) || '',
        expenseValue: (v.expenseValue as number)?.toString() || '',
        customerId: (editingVehicle.customerId as number)?.toString() || '',
        notes: (v.notes as string) || '',
        status: editingVehicle.status,
        opcionais,
        photos,
      })
      setBrandSearch(editingVehicle.brand)
      setModelSearch(editingVehicle.model)
      setYearSearch(editingVehicle.year.toString())
    }
    loadFipeBrands()
  }, [open, editingVehicle])

  useEffect(() => {
    if (open) {
      api.get('/customers').then((r) => setCustomers(r.data || [])).catch(() => setCustomers([]))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setSelectedBrandCode('')
    setSelectedModelCode('')
    setFipeModels([])
    setFipeYears([])
    setBrandSearch('')
    setModelSearch('')
    setYearSearch('')
    loadFipeBrands()
  }, [vehicleType, open])

  useEffect(() => {
    if (selectedBrandCode) loadFipeModels(selectedBrandCode)
    else setFipeModels([])
  }, [selectedBrandCode, vehicleType])

  useEffect(() => {
    if (selectedBrandCode && selectedModelCode) loadFipeYears(selectedBrandCode, selectedModelCode)
    else setFipeYears([])
  }, [selectedBrandCode, selectedModelCode, vehicleType])

  useEffect(() => {
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

  const handleBrandSelect = (brand: FipeBrand) => {
    setSelectedBrandCode(brand.codigo)
    setBrandSearch(brand.nome)
    setFormData((prev) => ({ ...prev, brand: brand.nome, model: '', year: '' }))
    setModelSearch('')
    setSelectedModelCode('')
    setYearSearch('')
    setShowBrandDropdown(false)
  }

  const handleModelSelect = (model: FipeModel) => {
    setSelectedModelCode(model.codigo)
    setFormData((prev) => ({ ...prev, model: model.nome, year: '' }))
    setModelSearch(model.nome)
    setYearSearch('')
    setShowModelDropdown(false)
  }

  const handleYearSelect = (year: FipeYear) => {
    const yearNumber = year.nome.split('/')[0]?.split('-')[0] || year.nome.split('-')[0] || year.nome
    setFormData((prev) => ({ ...prev, year: yearNumber }))
    setYearSearch(year.nome)
    setShowYearDropdown(false)
  }

  const filteredBrands = fipeBrands.filter((b) => b.nome.toLowerCase().includes(brandSearch.toLowerCase()))
  const filteredModels = fipeModels.filter((m) => m.nome.toLowerCase().includes(modelSearch.toLowerCase()))
  const filteredYears = fipeYears.filter((y) => y.nome.toLowerCase().includes(yearSearch.toLowerCase()))

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const toAdd = Math.min(MAX_PHOTOS - formData.photos.length, files.length)
    if (toAdd <= 0) return
    Array.from(files).slice(0, toAdd).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photos: [...prev.photos, reader.result as string] }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  const addOpcional = (item: string) => {
    if (formData.opcionais.includes(item)) return
    setFormData((prev) => ({ ...prev, opcionais: [...prev.opcionais, item] }))
  }

  const removeOpcional = (item: string) => {
    setFormData((prev) => ({ ...prev, opcionais: prev.opcionais.filter((o) => o !== item) }))
  }

  const filteredOpcionais = OPCIONAIS_LIST.filter(
    (o) => !formData.opcionais.includes(o) && o.toLowerCase().includes(opcionaisSearch.toLowerCase())
  )

  const handleSelectDocumentFile = (file: File | null) => {
    setVehicleDocumentFile(file)
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const yearVal = formData.year || formData.anoModelo || formData.anoFabricacao || ''
    if (!formData.brand || !formData.model || !yearVal) {
      alert('Preencha Marca, Modelo e Ano.')
      return
    }
    setSaving(true)
    try {
      const dataToSend = {
        brand: formData.brand,
        model: formData.model,
        year: parseInt(String(yearVal)) || new Date().getFullYear(),
        plate: formData.plate ? removeMask(formData.plate) : '',
        km: formData.km ? parseInt(formData.km) : null,
        color: formData.color || null,
        price: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        tableValue: formData.tableValue ? parseFloat(formData.tableValue) : null,
        expenseType: formData.expenseType || null,
        expenseValue: formData.expenseValue ? parseFloat(formData.expenseValue) : null,
        customerId: formData.customerId || null,
        notes: formData.notes || null,
        status: formData.status,
        photos: formData.photos.length ? formData.photos : null,
        empresa: formData.empresa || null,
        posicao: formData.posicao ? parseInt(formData.posicao) : null,
        conditionStatus: formData.conditionStatus || null,
        renavam: formData.renavam || null,
        cadastroOutrasLojas: formData.cadastroOutrasLojas,
        especie: formData.especie || null,
        combustivel: formData.combustivel || null,
        modeloDenatran: formData.modeloDenatran || null,
        modeloBase: formData.modeloBase || null,
        portas: formData.portas || null,
        carroceria: formData.carroceria || null,
        anoFabricacao: formData.anoFabricacao ? parseInt(formData.anoFabricacao) : null,
        anoModelo: formData.anoModelo ? parseInt(formData.anoModelo) : null,
        motorizacao: formData.motorizacao || null,
        cambio: formData.cambio || null,
        chassi: formData.chassi || null,
        chassiRemarcado: formData.chassiRemarcado,
        modeloFipe: formData.modeloFipe || null,
        cidadeEmplacamento: formData.cidadeEmplacamento || null,
        numeroCambio: formData.numeroCambio || null,
        hpCv: formData.hpCv || null,
        periciaCautelar: formData.periciaCautelar || null,
        passageiros: formData.passageiros || null,
        blindado: formData.blindado || null,
        origem: formData.origem || null,
        numeroMotor: formData.numeroMotor || null,
        corInterna: formData.corInterna || null,
        opcionais: formData.opcionais.length ? formData.opcionais : null,
      }

      let savedVehicleId: number | null = null
      let createdVehicle: VehicleFormModalVehicle | null = null
      if (editingVehicle) {
        const res = await api.put(`/vehicles/${editingVehicle.id}`, dataToSend)
        savedVehicleId = res.data?.vehicle?.id ?? editingVehicle.id
        createdVehicle = { ...editingVehicle, ...res.data?.vehicle }
      } else {
        const res = await api.post('/vehicles', dataToSend)
        createdVehicle = res.data?.vehicle || null
        savedVehicleId = createdVehicle?.id ?? null
      }

      if (vehicleDocumentFile && savedVehicleId) {
        setUploadingDoc(true)
        const fd = new FormData()
        fd.append('document', vehicleDocumentFile)
        await api.post(`/vehicles/${savedVehicleId}/document`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      if (createdVehicle) onSuccess?.(createdVehicle)
      onClose()
    } catch (err) {
      console.error('Erro ao salvar veículo:', err)
      alert('Erro ao salvar veículo')
    } finally {
      setSaving(false)
      setUploadingDoc(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold">{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 pt-4 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-2">
            {[
              { id: 1, label: 'Dados Básicos' },
              { id: 2, label: 'Identificação' },
              { id: 3, label: 'Especificações' },
              { id: 4, label: 'Outros / Valores' },
              { id: 5, label: 'Opcionais' },
              { id: 6, label: 'Fotos / Documento' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ${
                  activeStep === s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4">
            {activeStep === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Empresa *</label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Posição</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.posicao}
                    onChange={(e) => setFormData({ ...formData, posicao: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={formData.conditionStatus}
                    onChange={(e) => setFormData({ ...formData, conditionStatus: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="usado">Usado</option>
                    <option value="novo">Novo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placa *</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: formatPlate(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="ABC1D23"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Renavam</label>
                  <input
                    type="text"
                    value={formData.renavam}
                    onChange={(e) => setFormData({ ...formData, renavam: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.cadastroOutrasLojas}
                      onChange={(e) => setFormData({ ...formData, cadastroOutrasLojas: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-700">Cadastro feito por outras lojas</span>
                  </label>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Veículo</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="carros">Carros</option>
                    <option value="motos">Motos</option>
                    <option value="caminhoes">Caminhões</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Espécie *</label>
                    <select
                      value={formData.especie}
                      onChange={(e) => setFormData({ ...formData, especie: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      {ESPECIES.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Combustível *</label>
                    <select
                      value={formData.combustivel}
                      onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      {COMBUSTIVEIS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 searchable-select relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marca *</label>
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
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                      />
                      {showBrandDropdown && (loadingBrands || filteredBrands.length > 0 || brandSearch.length > 0) && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {loadingBrands ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">Carregando...</div>
                          ) : filteredBrands.length > 0 ? (
                            filteredBrands.map((brand) => (
                              <button
                                key={brand.codigo}
                                type="button"
                                onClick={() => handleBrandSelect(brand)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-900"
                              >
                                {brand.nome}
                              </button>
                            ))
                          ) : brandSearch.length > 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">Digite livremente se não encontrar.</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="searchable-select relative col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Modelo *</label>
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
                        onFocus={() => selectedBrandCode && setShowModelDropdown(true)}
                        disabled={!selectedBrandCode}
                        placeholder={selectedBrandCode ? 'Buscar modelos...' : 'Selecione marca'}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {showModelDropdown && selectedBrandCode && (loadingModels || filteredModels.length > 0 || modelSearch.length > 0) && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {loadingModels ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">Carregando...</div>
                          ) : filteredModels.length > 0 ? (
                            filteredModels.map((m) => (
                              <button
                                key={m.codigo}
                                type="button"
                                onClick={() => handleModelSelect(m)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-900"
                              >
                                {m.nome}
                              </button>
                            ))
                          ) : modelSearch.length > 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">Digite livremente.</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="searchable-select relative col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ano Fabricação/Modelo *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={yearSearch}
                        onChange={(e) => {
                          setYearSearch(e.target.value)
                          const n = e.target.value.replace(/\D/g, '')
                          if (n) setFormData((prev) => ({ ...prev, year: n }))
                          setShowYearDropdown(true)
                        }}
                        onFocus={() => selectedBrandCode && selectedModelCode && setShowYearDropdown(true)}
                        disabled={!selectedBrandCode || !selectedModelCode}
                        placeholder={selectedBrandCode && selectedModelCode ? 'Buscar ano...' : 'Marca e modelo primeiro'}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {showYearDropdown && selectedBrandCode && selectedModelCode && (loadingYears || filteredYears.length > 0 || yearSearch.length > 0) && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {loadingYears ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">Carregando...</div>
                          ) : filteredYears.length > 0 ? (
                            filteredYears.map((y) => (
                              <button
                                key={y.codigo}
                                type="button"
                                onClick={() => handleYearSelect(y)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-900"
                              >
                                {y.nome}
                              </button>
                            ))
                          ) : yearSearch.length > 0 ? (
                            <div className="px-3 py-2 text-gray-500 text-sm">Digite livremente.</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cor *</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder="Selecione ou digite"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Denatran</label>
                    <input
                      type="text"
                      value={formData.modeloDenatran}
                      onChange={(e) => setFormData({ ...formData, modeloDenatran: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quilometragem *</label>
                    <input
                      type="number"
                      value={formData.km}
                      onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Modelo Base</label>
                    <input
                      type="text"
                      value={formData.modeloBase}
                      onChange={(e) => setFormData({ ...formData, modeloBase: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Portas *</label>
                    <select
                      value={formData.portas}
                      onChange={(e) => setFormData({ ...formData, portas: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Selecione</option>
                      {PORTAS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Carroceria</label>
                    <input
                      type="text"
                      value={formData.carroceria}
                      onChange={(e) => setFormData({ ...formData, carroceria: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motorização</label>
                  <input
                    type="text"
                    value={formData.motorizacao}
                    onChange={(e) => setFormData({ ...formData, motorizacao: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="Ex: 1.6"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Câmbio *</label>
                  <select
                    value={formData.cambio}
                    onChange={(e) => setFormData({ ...formData, cambio: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    {CAMBIOS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chassi</label>
                  <input
                    type="text"
                    value={formData.chassi}
                    onChange={(e) => setFormData({ ...formData, chassi: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.chassiRemarcado}
                    onChange={(e) => setFormData({ ...formData, chassiRemarcado: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-xs text-gray-700">Chassi Remarcado</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Modelo FIPE</label>
                  <input
                    type="text"
                    value={formData.modeloFipe}
                    onChange={(e) => setFormData({ ...formData, modeloFipe: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cidade Emplacamento</label>
                  <input
                    type="text"
                    value={formData.cidadeEmplacamento}
                    onChange={(e) => setFormData({ ...formData, cidadeEmplacamento: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Número do Câmbio</label>
                  <input
                    type="text"
                    value={formData.numeroCambio}
                    onChange={(e) => setFormData({ ...formData, numeroCambio: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">HP/CV</label>
                  <input
                    type="text"
                    value={formData.hpCv}
                    onChange={(e) => setFormData({ ...formData, hpCv: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Perícia Cautelar</label>
                  <select
                    value={formData.periciaCautelar}
                    onChange={(e) => setFormData({ ...formData, periciaCautelar: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Selecione</option>
                    {PERICIA_CAUTELAR.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Passageiros</label>
                  <input
                    type="text"
                    value={formData.passageiros}
                    onChange={(e) => setFormData({ ...formData, passageiros: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Blindado</label>
                  <select
                    value={formData.blindado}
                    onChange={(e) => setFormData({ ...formData, blindado: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    {BLINDADO.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origem</label>
                  <select
                    value={formData.origem}
                    onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    {ORIGEM.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Número do Motor</label>
                  <input
                    type="text"
                    value={formData.numeroMotor}
                    onChange={(e) => setFormData({ ...formData, numeroMotor: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cor Interna</label>
                  <input
                    type="text"
                    value={formData.corInterna}
                    onChange={(e) => setFormData({ ...formData, corInterna: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor Venda</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor Tabela (FIPE)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tableValue}
                    onChange={(e) => setFormData({ ...formData, tableValue: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Gasto</label>
                  <input
                    type="text"
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="Ex: Pneu, Revisão"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor Gasto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.expenseValue}
                    onChange={(e) => setFormData({ ...formData, expenseValue: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="">Nenhum</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} – {c.phone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    placeholder="Observações"
                  />
                </div>
              </div>
            )}

            {activeStep === 5 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-600">
                  Selecione na caixa da esquerda e clique para adicionar. Clique na direita para remover.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      value={opcionaisSearch}
                      onChange={(e) => setOpcionaisSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg mb-2"
                    />
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                      {filteredOpcionais.slice(0, 80).map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => addOpcional(o)}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 rounded"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Selecionados ({formData.opcionais.length})</div>
                    <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                      {formData.opcionais.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => removeOpcional(o)}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-50 text-red-700 rounded"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 6 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Fotos</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="vehicle-photos-modal"
                    disabled={formData.photos.length >= MAX_PHOTOS}
                  />
                  {formData.photos.length >= MAX_PHOTOS ? (
                    <span className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900">
                      <FiImage /> Adicionar fotos ({formData.photos.length}/{MAX_PHOTOS})
                    </span>
                  ) : (
                    <label
                      htmlFor="vehicle-photos-modal"
                      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-900"
                    >
                      <FiImage /> Adicionar fotos ({formData.photos.length}/{MAX_PHOTOS})
                    </label>
                  )}
                  {formData.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.photos.map((p, i) => (
                        <div key={i} className="relative w-20 h-20 rounded overflow-hidden border border-gray-200">
                          <img src={p} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(i)}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Documento PDF</label>
                  <input
                    ref={docInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => handleSelectDocumentFile(e.target.files?.[0] || null)}
                  />
                  <div
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDoc(true) }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDoc(true) }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDoc(false) }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDraggingDoc(false)
                      handleSelectDocumentFile(e.dataTransfer.files?.[0] || null)
                    }}
                    className={`w-full rounded-lg border-2 border-dashed p-4 transition-colors ${
                      isDraggingDoc ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isDraggingDoc ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <FiFileText />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {vehicleDocumentFile ? 'PDF selecionado' : 'Anexar PDF do veículo'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Arraste e solte aqui ou clique em "Selecionar PDF"
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-900"
                      >
                        <FiUpload />
                        Selecionar PDF
                      </button>
                    </div>
                    {vehicleDocumentFile && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{vehicleDocumentFile.name}</div>
                          <div className="text-xs text-gray-500">{formatBytes(vehicleDocumentFile.size)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectDocumentFile(null)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          <FiX />
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <div className="flex gap-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Anterior
                </button>
              )}
              {activeStep < 6 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(activeStep + 1)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Próximo
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || uploadingDoc}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center text-sm"
              >
                {saving || uploadingDoc ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {uploadingDoc ? 'Enviando PDF...' : 'Salvando...'}
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

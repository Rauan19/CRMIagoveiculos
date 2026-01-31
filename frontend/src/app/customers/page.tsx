'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/services/api'
import ConfirmModal from '@/components/ConfirmModal'
import { formatCPF, formatPhone, formatCEP, formatRG, formatCNPJ, removeMask } from '@/utils/formatters'
import { FiPhone, FiMoreVertical, FiEdit, FiTrash2, FiEye, FiXCircle, FiCheckCircle, FiSearch, FiFilter } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'

interface Customer {
  id: number
  name: string
  phone: string
  email?: string
  cpf?: string
  rg?: string
  address?: string
  city?: string
  district?: string
  cep?: string
  birthDate?: string
  pessoaType?: string
  apelido?: string
  marcador?: string
  nomeMae?: string
  facebook?: string
  instagram?: string
  website?: string
  nacionalidade?: string
  naturalidade?: string
  sexo?: string
  estadoCivil?: string
  profissao?: string
  cnh?: string
  cnhVencimento?: string
  adicional?: string
  pendenciasFinanceiras?: string
  status: string
  compras?: number
  createdAt: string
}

function CustomersPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [detailsActiveStep, setDetailsActiveStep] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  // Estados para busca e filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPessoaType, setFilterPessoaType] = useState<string>('')
  const [filterMarcador, setFilterMarcador] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [formData, setFormData] = useState({
    // Dados Básicos
    pessoaType: 'Física',
    cpf: '',
    name: '',
    apelido: '',
    rg: '',
    nomeMae: '',
    // Contato
    phone: '',
    email: '',
    facebook: '',
    instagram: '',
    website: '',
    // Dados Pessoais
    nacionalidade: 'BRASILEIRA',
    naturalidade: '',
    birthDate: '',
    sexo: '',
    estadoCivil: '',
    profissao: '',
    // CNH
    cnh: '',
    cnhVencimento: '',
    // Endereço
    cep: '',
    city: '',
    district: '',
    address: '',
    // Adicional
    adicional: '',
    pendenciasFinanceiras: '',
    marcador: '',
    status: 'novo',
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    if (searchParams?.get('openModal') === 'create' && searchParams?.get('returnTo') === 'sinal-negocio') {
      setShowModal(true)
      setEditingCustomer(null)
      resetForm()
    }
  }, [searchParams])

  const loadCustomers = async () => {
    try {
      const response = await api.get('/customers')
      setCustomers(response.data)
      setFilteredCustomers(response.data)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes baseado na busca e filtros
  useEffect(() => {
    let filtered = [...customers]

    // Busca por nome, telefone, email, CPF
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.cpf?.includes(searchTerm) ||
        customer.apelido?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por status
    if (filterStatus) {
      filtered = filtered.filter(customer => customer.status === filterStatus)
    }

    // Filtro por tipo de pessoa
    if (filterPessoaType) {
      filtered = filtered.filter(customer => customer.pessoaType === filterPessoaType)
    }

    // Filtro por marcador
    if (filterMarcador) {
      filtered = filtered.filter(customer => customer.marcador === filterMarcador)
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'phone':
          aValue = a.phone || ''
          bValue = b.phone || ''
          break
        case 'compras':
          aValue = a.compras || 0
          bValue = b.compras || 0
          break
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, filterStatus, filterPessoaType, filterMarcador, sortBy, sortOrder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Remover máscaras antes de enviar
      const dataToSend = {
        ...formData,
        cpf: formData.cpf ? removeMask(formData.cpf) : '',
        phone: formData.phone ? removeMask(formData.phone) : '',
        cep: formData.cep ? removeMask(formData.cep) : '',
        rg: formData.rg ? removeMask(formData.rg) : '',
        cnh: formData.cnh || '',
        birthDate: formData.birthDate || null,
        cnhVencimento: formData.cnhVencimento || null,
      }
      
      let createdCustomer: Customer | null = null
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, dataToSend)
      } else {
        const res = await api.post('/customers', dataToSend)
        createdCustomer = res.data?.customer ?? res.data
      }
      setShowModal(false)
      setEditingCustomer(null)
      resetForm()
      await loadCustomers()
      const returnTo = searchParams?.get('returnTo')
      if (returnTo === 'sinal-negocio' && createdCustomer) {
        router.push(`/sinal-negocio?newCustomerId=${createdCustomer.id}&openModal=sinal`)
        return
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Erro ao salvar cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailsModal(true)
    setDetailsActiveStep(1)
    setOpenMenuId(null)
    setMenuPosition(null)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setActiveStep(1)
    setOpenMenuId(null)
    setMenuPosition(null)
    // Aplicar máscaras ao carregar dados para edição
    setFormData({
      pessoaType: customer.pessoaType || 'Física',
      cpf: customer.cpf 
        ? (customer.pessoaType === 'Jurídica' 
            ? formatCNPJ(customer.cpf) 
            : formatCPF(customer.cpf))
        : '',
      name: customer.name,
      apelido: customer.apelido || '',
      rg: customer.rg ? formatRG(customer.rg) : '',
      nomeMae: (customer as any).nomeMae || '',
      phone: customer.phone ? formatPhone(customer.phone) : '',
      email: customer.email || '',
      facebook: (customer as any).facebook || '',
      instagram: (customer as any).instagram || '',
      website: (customer as any).website || '',
      nacionalidade: (customer as any).nacionalidade || 'BRASILEIRA',
      naturalidade: (customer as any).naturalidade || '',
      birthDate: customer.birthDate ? customer.birthDate.split('T')[0] : '',
      sexo: (customer as any).sexo || '',
      estadoCivil: (customer as any).estadoCivil || '',
      profissao: (customer as any).profissao || '',
      cnh: (customer as any).cnh || '',
      cnhVencimento: (customer as any).cnhVencimento ? (customer as any).cnhVencimento.split('T')[0] : '',
      cep: customer.cep ? formatCEP(customer.cep) : '',
      city: customer.city || '',
      district: customer.district || '',
      address: customer.address || '',
      adicional: (customer as any).adicional || '',
      pendenciasFinanceiras: (customer as any).pendenciasFinanceiras || '',
      marcador: customer.marcador || '',
      status: customer.status,
    })
    setShowModal(true)
  }

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id)
    setShowConfirmModal(true)
    setOpenMenuId(null)
    setMenuPosition(null)
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    setShowConfirmModal(false)
    setDeleting(confirmDeleteId)
    try {
      await api.delete(`/customers/${confirmDeleteId}`)
      loadCustomers()
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      alert('Erro ao excluir cliente')
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowConfirmModal(false)
    setConfirmDeleteId(null)
  }

  const handleInativarCliente = async (customer: Customer) => {
    if (!confirm(`Tem certeza que deseja ${customer.status === 'inativo' ? 'ativar' : 'inativar'} o cliente ${customer.name}?`)) {
      return
    }

    try {
      const newStatus = customer.status === 'inativo' ? 'novo' : 'inativo'
      await api.put(`/customers/${customer.id}`, { status: newStatus })
      loadCustomers()
    } catch (error: any) {
      console.error('Erro ao alterar status do cliente:', error)
      alert(error.response?.data?.error || 'Erro ao alterar status do cliente')
    }
  }

  const resetForm = () => {
    setActiveStep(1)
    setFormData({
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
  }

  return (
    <Layout>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <button
            onClick={() => {
              resetForm()
              setEditingCustomer(null)
              setShowModal(true)
            }}
            className="bg-primary-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Novo Cliente
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : (
          <>
            {/* Busca e Filtros */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="space-y-2">
                {/* Busca */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, telefone, email, CPF..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todos</option>
                      <option value="novo">Novo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Tipo Pessoa</label>
                    <select
                      value={filterPessoaType}
                      onChange={(e) => setFilterPessoaType(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todos</option>
                      <option value="Física">Física</option>
                      <option value="Jurídica">Jurídica</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Marcador</label>
                    <select
                      value={filterMarcador}
                      onChange={(e) => setFilterMarcador(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="">Todos</option>
                      {Array.from(new Set(customers.map(c => c.marcador).filter(Boolean))).map(marcador => (
                        <option key={marcador} value={marcador}>{marcador}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ordenar por</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="createdAt">Data Cadastro</option>
                      <option value="name">Nome</option>
                      <option value="phone">Telefone</option>
                      <option value="compras">Compras</option>
                      <option value="status">Status</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">Ordem</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterStatus('')
                        setFilterPessoaType('')
                        setFilterMarcador('')
                        setSortBy('createdAt')
                        setSortOrder('desc')
                      }}
                      className="w-full px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Contador de resultados */}
                <div className="text-xs text-gray-500">
                  Mostrando {filteredCustomers.length} de {customers.length} cliente(s)
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden max-h-[calc(100vh-280px)] flex flex-col relative">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200 relative">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pessoa</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome Completo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Apelido</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPF/CNPJ</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compras</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marcador</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-3 text-center text-sm text-gray-500">
                        {customers.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado com os filtros aplicados'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                          {customer.pessoaType || 'Física'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                          {customer.name}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                          {customer.apelido || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                          {customer.cpf 
                            ? (customer.pessoaType === 'Jurídica' 
                                ? formatCNPJ(customer.cpf) 
                                : formatCPF(customer.cpf))
                            : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{formatPhone(customer.phone)}</span>
                            <a
                              href={`https://wa.me/55${customer.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="Abrir no WhatsApp"
                            >
                              <FaWhatsapp className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center">
                          {customer.compras || 0}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                            customer.status === 'inativo' 
                              ? 'bg-red-100 text-red-800' 
                              : customer.status === 'novo'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {customer.status === 'inativo' ? 'Inativo' : customer.status === 'novo' ? 'Novo' : customer.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {customer.marcador ? (
                            <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {customer.marcador}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const rect = e.currentTarget.getBoundingClientRect()
                              if (openMenuId === customer.id) {
                                setOpenMenuId(null)
                                setMenuPosition(null)
                              } else {
                                setOpenMenuId(customer.id)
                                setMenuPosition({
                                  x: rect.right - 160,
                                  y: rect.bottom + 4
                                })
                              }
                            }}
                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <FiMoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">
                  {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                </h2>
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
                      onClick={() => setActiveStep(step.id)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                        activeStep === step.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {/* Etapa 1: Dados Básicos */}
                  {activeStep === 1 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Pessoa *</label>
                          <select
                            required
                            value={formData.pessoaType}
                            onChange={(e) => setFormData({ ...formData, pessoaType: e.target.value, cpf: '' })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="Física">Física</option>
                            <option value="Jurídica">Jurídica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {formData.pessoaType === 'Jurídica' ? 'CNPJ *' : 'CPF *'}
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={formData.pessoaType === 'Jurídica' ? 18 : 14}
                            value={formData.cpf}
                            onChange={(e) => {
                              const formatted = formData.pessoaType === 'Jurídica' 
                                ? formatCNPJ(e.target.value)
                                : formatCPF(e.target.value)
                              setFormData({ ...formData, cpf: formatted })
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder={formData.pessoaType === 'Jurídica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Apelido</label>
                          <input
                            type="text"
                            value={formData.apelido}
                            onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">RG</label>
                          <input
                            type="text"
                            maxLength={12}
                            value={formData.rg}
                            onChange={(e) => setFormData({ ...formData, rg: formatRG(e.target.value) })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="00.000.000-0"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Mãe</label>
                          <input
                            type="text"
                            value={formData.nomeMae}
                            onChange={(e) => setFormData({ ...formData, nomeMae: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 2: Contato */}
                  {activeStep === 2 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Telefone *</label>
                          <input
                            type="text"
                            required
                            maxLength={15}
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Facebook</label>
                          <input
                            type="text"
                            value={formData.facebook}
                            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="URL ou nome de usuário"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Instagram</label>
                          <input
                            type="text"
                            value={formData.instagram}
                            onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="@usuario"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                          <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 3: Dados Pessoais */}
                  {activeStep === 3 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nacionalidade</label>
                          <input
                            type="text"
                            value={formData.nacionalidade}
                            onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="BRASILEIRA"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Naturalidade</label>
                          <input
                            type="text"
                            value={formData.naturalidade}
                            onChange={(e) => setFormData({ ...formData, naturalidade: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Cidade/Estado"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Data de Nascimento</label>
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Sexo</label>
                          <select
                            value={formData.sexo}
                            onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          >
                            <option value="">Selecione</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Estado Civil</label>
                          <select
                            value={formData.estadoCivil}
                            onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">Profissão</label>
                          <input
                            type="text"
                            value={formData.profissao}
                            onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 4: CNH */}
                  {activeStep === 4 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">CNH</label>
                          <input
                            type="text"
                            value={formData.cnh}
                            onChange={(e) => setFormData({ ...formData, cnh: e.target.value.replace(/\D/g, '') })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Número da CNH"
                            maxLength={11}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Data Vencimento CNH</label>
                          <input
                            type="date"
                            value={formData.cnhVencimento}
                            onChange={(e) => setFormData({ ...formData, cnhVencimento: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 5: Endereço */}
                  {activeStep === 5 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
                          <input
                            type="text"
                            maxLength={9}
                            value={formData.cep}
                            onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="00000-000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Cidade</label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Bairro</label>
                          <input
                            type="text"
                            value={formData.district}
                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Endereço</label>
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Etapa 6: Adicional */}
                  {activeStep === 6 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Adicional</label>
                          <textarea
                            value={formData.adicional}
                            onChange={(e) => setFormData({ ...formData, adicional: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            rows={3}
                            placeholder="Informações adicionais..."
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Pendências Financeiras</label>
                          <textarea
                            value={formData.pendenciasFinanceiras}
                            onChange={(e) => setFormData({ ...formData, pendenciasFinanceiras: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            rows={3}
                            placeholder="Descreva pendências financeiras..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Marcador</label>
                          <input
                            type="text"
                            value={formData.marcador}
                            onChange={(e) => setFormData({ ...formData, marcador: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                            placeholder="Tag/Marcador"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
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
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                    {activeStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setActiveStep(activeStep - 1)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Anterior
                      </button>
                    )}
                    {activeStep < 6 && (
                      <button
                        type="button"
                        onClick={() => setActiveStep(activeStep + 1)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Próximo
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingCustomer(null)
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
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Menu Dropdown Fixo */}
      {openMenuId !== null && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.stopPropagation()
              setOpenMenuId(null)
              setMenuPosition(null)
            }}
          />
          <div 
            className="fixed w-40 bg-white rounded-lg shadow-xl border border-gray-200 z-[101] py-1"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {customers.find(c => c.id === openMenuId) && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const customer = customers.find(c => c.id === openMenuId)
                    if (customer) {
                      handleViewDetails(customer)
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FiEye className="h-3.5 w-3.5" />
                  Ver Detalhes
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const customer = customers.find(c => c.id === openMenuId)
                    if (customer) {
                      handleEdit(customer)
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-primary-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FiEdit className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const customer = customers.find(c => c.id === openMenuId)
                    if (customer) {
                      handleInativarCliente(customer)
                    }
                    setOpenMenuId(null)
                    setMenuPosition(null)
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-orange-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  {customers.find(c => c.id === openMenuId)?.status === 'inativo' ? (
                    <>
                      <FiCheckCircle className="h-3.5 w-3.5" />
                      Ativar Cliente
                    </>
                  ) : (
                    <>
                      <FiXCircle className="h-3.5 w-3.5" />
                      Inativar Cliente
                    </>
                  )}
                </button>
                <div className="border-t border-gray-200 my-1" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (openMenuId) {
                      handleDeleteClick(openMenuId)
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </>
            )}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este cliente?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />

      {/* Modal de Detalhes */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">Detalhes do Cliente</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedCustomer(null)
                  setDetailsActiveStep(1)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
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
                    onClick={() => setDetailsActiveStep(step.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      detailsActiveStep === step.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Etapa 1: Dados Básicos */}
              {detailsActiveStep === 1 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Pessoa:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.pessoaType || 'Física'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">CPF/CNPJ:</span>
                      <span className="ml-2 text-gray-900">
                        {selectedCustomer.cpf 
                          ? (selectedCustomer.pessoaType === 'Jurídica' 
                              ? formatCNPJ(selectedCustomer.cpf) 
                              : formatCPF(selectedCustomer.cpf))
                          : '-'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Nome Completo:</span>
                      <span className="ml-2 text-gray-900">{selectedCustomer.name}</span>
                    </div>
                    {selectedCustomer.apelido && (
                      <div>
                        <span className="text-gray-500">Apelido:</span>
                        <span className="ml-2 text-gray-900">{selectedCustomer.apelido}</span>
                      </div>
                    )}
                    {selectedCustomer.rg && (
                      <div>
                        <span className="text-gray-500">RG:</span>
                        <span className="ml-2 text-gray-900">{formatRG(selectedCustomer.rg)}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).nomeMae && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Nome da Mãe:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).nomeMae}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Etapa 2: Contato */}
              {detailsActiveStep === 2 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Telefone:</span>
                      <span className="ml-2 text-gray-900">{formatPhone(selectedCustomer.phone)}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 text-gray-900">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).facebook && (
                      <div>
                        <span className="text-gray-500">Facebook:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).facebook}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).instagram && (
                      <div>
                        <span className="text-gray-500">Instagram:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).instagram}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).website && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Website:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).website}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Etapa 3: Dados Pessoais */}
              {detailsActiveStep === 3 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {(selectedCustomer as any).nacionalidade && (
                      <div>
                        <span className="text-gray-500">Nacionalidade:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).nacionalidade}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).naturalidade && (
                      <div>
                        <span className="text-gray-500">Naturalidade:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).naturalidade}</span>
                      </div>
                    )}
                    {selectedCustomer.birthDate && (
                      <div>
                        <span className="text-gray-500">Data de Nascimento:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(selectedCustomer.birthDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {(selectedCustomer as any).sexo && (
                      <div>
                        <span className="text-gray-500">Sexo:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).sexo}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).estadoCivil && (
                      <div>
                        <span className="text-gray-500">Estado Civil:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).estadoCivil}</span>
                      </div>
                    )}
                    {(selectedCustomer as any).profissao && (
                      <div>
                        <span className="text-gray-500">Profissão:</span>
                        <span className="ml-2 text-gray-900">{(selectedCustomer as any).profissao}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Etapa 4: CNH */}
              {detailsActiveStep === 4 && (
                <div className="space-y-3">
                  {((selectedCustomer as any).cnh || (selectedCustomer as any).cnhVencimento) ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {(selectedCustomer as any).cnh && (
                        <div>
                          <span className="text-gray-500">CNH:</span>
                          <span className="ml-2 text-gray-900">{(selectedCustomer as any).cnh}</span>
                        </div>
                      )}
                      {(selectedCustomer as any).cnhVencimento && (
                        <div>
                          <span className="text-gray-500">Data Vencimento:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date((selectedCustomer as any).cnhVencimento).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      Nenhuma informação de CNH cadastrada
                    </div>
                  )}
                </div>
              )}

              {/* Etapa 5: Endereço */}
              {detailsActiveStep === 5 && (
                <div className="space-y-3">
                  {(selectedCustomer.address || selectedCustomer.city || selectedCustomer.district || selectedCustomer.cep) ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedCustomer.cep && (
                        <div>
                          <span className="text-gray-500">CEP:</span>
                          <span className="ml-2 text-gray-900">{formatCEP(selectedCustomer.cep)}</span>
                        </div>
                      )}
                      {selectedCustomer.city && (
                        <div>
                          <span className="text-gray-500">Cidade:</span>
                          <span className="ml-2 text-gray-900">{selectedCustomer.city}</span>
                        </div>
                      )}
                      {selectedCustomer.district && (
                        <div>
                          <span className="text-gray-500">Bairro:</span>
                          <span className="ml-2 text-gray-900">{selectedCustomer.district}</span>
                        </div>
                      )}
                      {selectedCustomer.address && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Endereço:</span>
                          <span className="ml-2 text-gray-900">{selectedCustomer.address}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      Nenhuma informação de endereço cadastrada
                    </div>
                  )}
                </div>
              )}

              {/* Etapa 6: Adicional */}
              {detailsActiveStep === 6 && (
                <div className="space-y-3">
                  <div className="space-y-4 text-sm">
                    {selectedCustomer.marcador && (
                      <div>
                        <span className="text-gray-500">Marcador:</span>
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {selectedCustomer.marcador}
                        </span>
                      </div>
                    )}
                    {(selectedCustomer as any).adicional && (
                      <div>
                        <span className="text-gray-500 font-medium">Adicional:</span>
                        <p className="mt-1 text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {(selectedCustomer as any).adicional}
                        </p>
                      </div>
                    )}
                    {(selectedCustomer as any).pendenciasFinanceiras && (
                      <div>
                        <span className="text-gray-500 font-medium">Pendências Financeiras:</span>
                        <p className="mt-1 text-gray-900 whitespace-pre-wrap bg-red-50 p-3 rounded-lg">
                          {(selectedCustomer as any).pendenciasFinanceiras}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {selectedCustomer.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Compras:</span>
                        <span className="ml-2 text-gray-900 font-medium">{selectedCustomer.compras || 0}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Cadastrado em:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(selectedCustomer.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    {!selectedCustomer.marcador && !(selectedCustomer as any).adicional && !(selectedCustomer as any).pendenciasFinanceiras && (
                      <div className="text-sm text-gray-500 text-center py-8">
                        Nenhuma informação adicional cadastrada
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Botões de Navegação */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex gap-2">
                {detailsActiveStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setDetailsActiveStep(detailsActiveStep - 1)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Anterior
                  </button>
                )}
                {detailsActiveStep < 6 && (
                  <button
                    type="button"
                    onClick={() => setDetailsActiveStep(detailsActiveStep + 1)}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Próximo
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedCustomer(null)
                  setDetailsActiveStep(1)
                }}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-500">Carregando...</div>}>
      <CustomersPageContent />
    </Suspense>
  )
}

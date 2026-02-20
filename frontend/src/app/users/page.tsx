'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { useAuthStore } from '@/store/authStore'
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiShield, FiUser, FiAlertCircle } from 'react-icons/fi'

interface User {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
  _count?: {
    sales: number
  }
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [hasPermission, setHasPermission] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [formData, setFormData] = useState({
    // Dados Básicos
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
    admissionDate: '',
    dismissalDate: '',
    cpf: '',
    rg: '',
    sexo: '',
    birthDate: '',
    ctps: '',
    cnh: '',
    // Endereço (residencial)
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    state: '',
    city: '',
    // Telefones
    phone_cell: '',
    phone_cell_dd: '',
    phone_cell_ram: '',
    phone_commercial: '',
    phone_commercial_dd: '',
    phone_commercial_ram: '',
    phone_fax: '',
    phone_fax_dd: '',
    phone_fax_ram: '',
    phone_residential: '',
    phone_residential_dd: '',
    phone_residential_ram: '',
    phone_additional: '',
    phone_additional_ram: '',
    // Remuneração
    cargo: '',
    beneficios: '',
    salary: '',
    receivesCommission: 'false',
    // Documentos (filenames placeholder)
    documents: [] as { name: string; url?: string }[],
  })

  useEffect(() => {
    // Aguardar um pouco para o Zustand restaurar do localStorage
    const timer = setTimeout(() => {
      const currentUser = useAuthStore.getState().user
      console.log('🔍 Verificando usuário:', currentUser) // Debug
      
      if (!currentUser) {
        setHasPermission(false)
        setLoading(false)
        setToast({ message: 'Usuário não encontrado. Faça login novamente.', type: 'error' })
        return
      }
      
      console.log('👤 Role do usuário:', currentUser.role) // Debug
      // Tentar carregar a lista - se der 403, significa que não tem permissão
      loadUsers()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [])

  const loadUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
      setHasPermission(true)
    } catch (error: any) {
      console.error('Erro ao carregar funcionários:', error)
      if (error.response?.status === 403) {
        setHasPermission(false)
        setToast({ message: 'Você não tem permissão para visualizar funcionários', type: 'error' })
      } else {
        setToast({ message: 'Erro ao carregar funcionários', type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingUser) {
        const dataToSend: any = {
          // enviar campos extras para backend (se o backend suportar)
          name: formData.name,
          email: formData.email,
          role: formData.role,
          admissionDate: formData.admissionDate,
          dismissalDate: formData.dismissalDate,
          cpf: formData.cpf,
          rg: formData.rg,
          sexo: formData.sexo,
          birthDate: formData.birthDate,
          ctps: formData.ctps,
          cnh: formData.cnh,
          address: {
            cep: formData.cep,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            state: formData.state,
            city: formData.city,
          },
          phones: {
            cell: { dd: formData.phone_cell_dd, number: formData.phone_cell, ramal: formData.phone_cell_ram },
            commercial: { dd: formData.phone_commercial_dd, number: formData.phone_commercial, ramal: formData.phone_commercial_ram },
            fax: { dd: formData.phone_fax_dd, number: formData.phone_fax, ramal: formData.phone_fax_ram },
            residential: { dd: formData.phone_residential_dd, number: formData.phone_residential, ramal: formData.phone_residential_ram },
            additional: { number: formData.phone_additional, ramal: formData.phone_additional_ram },
          },
          remuneration: {
            cargo: formData.cargo,
            beneficios: formData.beneficios,
            salary: formData.salary,
            receivesCommission: formData.receivesCommission === 'true',
          },
          documents: formData.documents,
        }
        if (formData.password) dataToSend.password = formData.password
        await api.put(`/users/${editingUser.id}`, dataToSend)
        setToast({ message: 'Funcionário atualizado com sucesso!', type: 'success' })
      } else {
        // Enviar criação com campos adicionais (backend pode ignorar campos não suportados)
        await api.post('/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          admissionDate: formData.admissionDate,
          dismissalDate: formData.dismissalDate,
          cpf: formData.cpf,
          rg: formData.rg,
          sexo: formData.sexo,
          birthDate: formData.birthDate,
          ctps: formData.ctps,
          cnh: formData.cnh,
          address: {
            cep: formData.cep,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            state: formData.state,
            city: formData.city,
          },
          phones: {
            cell: { dd: formData.phone_cell_dd, number: formData.phone_cell, ramal: formData.phone_cell_ram },
            commercial: { dd: formData.phone_commercial_dd, number: formData.phone_commercial, ramal: formData.phone_commercial_ram },
            fax: { dd: formData.phone_fax_dd, number: formData.phone_fax, ramal: formData.phone_fax_ram },
            residential: { dd: formData.phone_residential_dd, number: formData.phone_residential, ramal: formData.phone_residential_ram },
            additional: { number: formData.phone_additional, ramal: formData.phone_additional_ram },
          },
          remuneration: {
            cargo: formData.cargo,
            beneficios: formData.beneficios,
            salary: formData.salary,
            receivesCommission: formData.receivesCommission === 'true',
          },
          documents: formData.documents,
        })
        setToast({ message: 'Funcionário criado com sucesso!', type: 'success' })
      }
      setShowModal(false)
      setEditingUser(null)
      resetForm()
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao salvar funcionário:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao salvar funcionário', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData((prev) => ({
      ...prev,
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'vendedor',
      admissionDate: (user as any).admissionDate || '',
      dismissalDate: (user as any).dismissalDate || '',
      cpf: (user as any).cpf || '',
      rg: (user as any).rg || '',
      sexo: (user as any).sexo || '',
      birthDate: (user as any).birthDate || '',
      ctps: (user as any).ctps || '',
      cnh: (user as any).cnh || '',
      cep: (user as any).address?.cep || '',
      street: (user as any).address?.street || '',
      number: (user as any).address?.number || '',
      complement: (user as any).address?.complement || '',
      neighborhood: (user as any).address?.neighborhood || '',
      state: (user as any).address?.state || '',
      city: (user as any).address?.city || '',
      cargo: (user as any).remuneration?.cargo || '',
      beneficios: (user as any).remuneration?.beneficios || '',
      salary: (user as any).remuneration?.salary || '',
      receivesCommission: (user as any).remuneration?.receivesCommission ? 'true' : 'false',
      documents: (user as any).documents || [],
    }))
    setActiveStep(1)
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
      await api.delete(`/users/${confirmDeleteId}`)
      setToast({ message: 'Funcionário excluído com sucesso!', type: 'success' })
      loadUsers()
    } catch (error: any) {
      console.error('Erro ao excluir funcionário:', error)
      setToast({ message: error.response?.data?.error || 'Erro ao excluir funcionário', type: 'error' })
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
      name: '',
      email: '',
      password: '',
      role: 'vendedor',
    })
  }

  const openModal = () => {
    resetForm()
    setEditingUser(null)
    setShowModal(true)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'gerente':
        return 'Gerente'
      case 'vendedor':
        return 'Vendedor'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'gerente':
        return 'bg-blue-100 text-blue-800'
      case 'vendedor':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-600 mt-1">Gerencie funcionários e vendedores</p>
          </div>
          {user && (
            <button
              onClick={openModal}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <FiPlus />
              Novo Funcionário
            </button>
          )}
        </div>


        {/* Lista */}
        {loading ? (
          <div className="text-center py-12 text-gray-700">Carregando...</div>
        ) : hasPermission ? (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 max-h-[calc(100vh-220px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Cadastro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Nenhum funcionário cadastrado
                      </td>
                    </tr>
                  ) : (
                    users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              {userItem.role === 'admin' ? (
                                <FiShield className="h-5 w-5 text-gray-600" />
                              ) : (
                                <FiUser className="h-5 w-5 text-gray-600" />
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userItem.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userItem.role)}`}>
                            {getRoleLabel(userItem.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {userItem._count?.sales || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(userItem.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {user && (
                            <>
                              <button
                                onClick={() => handleEdit(userItem)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Editar"
                              >
                                <FiEdit />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(userItem.id)}
                                disabled={deleting === userItem.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Excluir"
                              >
                                {deleting === userItem.id ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                ) : (
                                  <FiTrash2 />
                                )}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Modal */}
        {showModal && user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingUser ? 'Editar Funcionário' : 'Novo Funcionário'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Steps indicator */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`px-3 py-1 rounded ${activeStep===1 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>1 Dados Básicos</div>
                    <div className={`px-3 py-1 rounded ${activeStep===2 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>2 Endereços</div>
                    <div className={`px-3 py-1 rounded ${activeStep===3 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>3 Telefones</div>
                    <div className={`px-3 py-1 rounded ${activeStep===4 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>4 Remuneração</div>
                    <div className={`px-3 py-1 rounded ${activeStep===5 ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>5 Documentos</div>
                  </div>

                  {/* Step 1 - Dados Básicos */}
                  {activeStep === 1 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data admissão</label>
                          <input type="date" value={formData.admissionDate} onChange={(e)=>setFormData({...formData, admissionDate: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data demissão</label>
                          <input type="date" value={formData.dismissalDate} onChange={(e)=>setFormData({...formData, dismissalDate: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input type="text" required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                          <input type="text" value={formData.cpf} onChange={(e)=>setFormData({...formData, cpf: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                          <input type="text" value={formData.rg} onChange={(e)=>setFormData({...formData, rg: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                          <select value={formData.sexo} onChange={(e)=>setFormData({...formData, sexo: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900">
                            <option value="">Selecione</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                            <option value="O">Outro</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                          <input type="date" value={formData.birthDate} onChange={(e)=>setFormData({...formData, birthDate: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CTPS</label>
                          <input type="text" value={formData.ctps} onChange={(e)=>setFormData({...formData, ctps: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CNH</label>
                          <input type="text" value={formData.cnh} onChange={(e)=>setFormData({...formData, cnh: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" disabled={!!editingUser} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
                        <input type="password" required={!editingUser} value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                        <select required value={formData.role} onChange={(e)=>setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900">
                          <option value="vendedor">Vendedor</option>
                          <option value="gerente">Gerente</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 2 - Endereços */}
                  {activeStep === 2 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                        <input value={formData.cep} onChange={(e)=>setFormData({...formData, cep: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                        <input value={formData.street} onChange={(e)=>setFormData({...formData, street: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Nome da rua ou logradouro..." />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input value={formData.number} onChange={(e)=>setFormData({...formData, number: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Número" />
                        <input value={formData.complement} onChange={(e)=>setFormData({...formData, complement: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Complemento" />
                        <input value={formData.neighborhood} onChange={(e)=>setFormData({...formData, neighborhood: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Bairro" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={formData.state} onChange={(e)=>setFormData({...formData, state: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Estado" />
                        <input value={formData.city} onChange={(e)=>setFormData({...formData, city: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Cidade" />
                      </div>
                    </div>
                  )}

                  {/* Step 3 - Telefones */}
                  {activeStep === 3 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Celular (DDD)</label>
                          <input value={formData.phone_cell_dd} onChange={(e)=>setFormData({...formData, phone_cell_dd: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="DDD" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Celular (Número)</label>
                          <input value={formData.phone_cell} onChange={(e)=>setFormData({...formData, phone_cell: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Telefone" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Ramal</label>
                          <input value={formData.phone_cell_ram} onChange={(e)=>setFormData({...formData, phone_cell_ram: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" placeholder="Ramal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Comercial (DDD)</label>
                          <input value={formData.phone_commercial_dd} onChange={(e)=>setFormData({...formData, phone_commercial_dd: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Comercial (Número)</label>
                          <input value={formData.phone_commercial} onChange={(e)=>setFormData({...formData, phone_commercial: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Ramal</label>
                          <input value={formData.phone_commercial_ram} onChange={(e)=>setFormData({...formData, phone_commercial_ram: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Residencial (DDD)</label>
                          <input value={formData.phone_residential_dd} onChange={(e)=>setFormData({...formData, phone_residential_dd: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Residencial (Número)</label>
                          <input value={formData.phone_residential} onChange={(e)=>setFormData({...formData, phone_residential: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Ramal</label>
                          <input value={formData.phone_residential_ram} onChange={(e)=>setFormData({...formData, phone_residential_ram: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Fax (DDD/Número)</label>
                          <input value={formData.phone_fax} onChange={(e)=>setFormData({...formData, phone_fax: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Adicional / Recado</label>
                          <input value={formData.phone_additional} onChange={(e)=>setFormData({...formData, phone_additional: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4 - Remuneração */}
                  {activeStep === 4 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Cargo *</label>
                        <input value={formData.cargo} onChange={(e)=>setFormData({...formData, cargo: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Benefícios</label>
                        <input value={formData.beneficios} onChange={(e)=>setFormData({...formData, beneficios: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Salário</label>
                          <input type="number" value={formData.salary} onChange={(e)=>setFormData({...formData, salary: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Funcionário recebe comissão?</label>
                          <select value={formData.receivesCommission} onChange={(e)=>setFormData({...formData, receivesCommission: e.target.value})} className="w-full px-3 py-2 border rounded text-gray-900">
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 5 - Documentos */}
                  {activeStep === 5 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Documentos</label>
                        <div className="flex gap-2 items-center">
                          <input type="file" accept=".pdf,.jpg,.png" onChange={(e)=> {
                            const f = e.target.files?.[0]
                            if (!f) return
                            setFormData({...formData, documents: [...formData.documents, { name: f.name }]})
                            e.currentTarget.value = ''
                          }} />
                          <span className="text-sm text-gray-500">Enviar PDF ou imagem</span>
                        </div>
                        <ul className="mt-2">
                          {formData.documents.map((d, i)=>(
                            <li key={i} className="flex items-center justify-between py-1">
                              <span className="text-sm text-gray-700">{d.name}</span>
                              <button type="button" onClick={()=>setFormData({...formData, documents: formData.documents.filter((_,idx)=>idx!==i)})} className="text-sm text-red-600">Remover</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex justify-between items-center pt-4">
                    <div>
                      {activeStep > 1 && <button type="button" onClick={()=>setActiveStep(activeStep-1)} className="px-3 py-2 border rounded text-gray-700">Anterior</button>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} disabled={saving} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                      {activeStep < 5 ? (
                        <button type="button" onClick={()=>setActiveStep(activeStep+1)} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Próximo</button>
                      ) : (
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center">
                          {saving ? (<><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Salvando...</>) : 'Salvar'}
                        </button>
                      )}
                    </div>
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
        message="Tem certeza que deseja excluir este funcionário?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmColor="red"
      />
    </Layout>
  )
}


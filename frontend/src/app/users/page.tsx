'use client'

import { useMemo, useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import Toast from '@/components/Toast'
import ConfirmModal from '@/components/ConfirmModal'
import { useAuthStore } from '@/store/authStore'
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiShield, FiUser, FiEye } from 'react-icons/fi'

interface User {
  id: number
  name: string
  email: string
  role: string
  createdAt: string
  _count?: {
    sales: number
  }
  admissionDate?: string | null
  dismissalDate?: string | null
  cpf?: string | null
  phone_cell?: string | null
  phone_commercial?: string | null
  phone_residential?: string | null
  phones?: any
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewedUser, setViewedUser] = useState<User | null>(null)
  const [loadingView, setLoadingView] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [hasPermission, setHasPermission] = useState(true)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(40)
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

  useEffect(() => {
    setPage(1)
  }, [users.length, pageSize])

  const totalResults = users.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = totalResults === 0 ? 0 : (safePage - 1) * pageSize
  const endIndexExclusive = Math.min(startIndex + pageSize, totalResults)
  const pageUsers = users.slice(startIndex, endIndexExclusive)

  const pagesToShow = useMemo(() => {
    const total = totalPages
    const current = safePage
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = new Set<number>()
    pages.add(1)
    pages.add(total)
    pages.add(current)
    pages.add(current - 1)
    pages.add(current + 1)
    pages.add(current - 2)
    pages.add(current + 2)
    const arr = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
    const out: Array<number> = []
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      const prev = arr[i - 1]
      if (i > 0 && prev != null && p - prev > 1) out.push(-1)
      out.push(p)
    }
    return out
  }, [safePage, totalPages])

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
        // Flatten payload for update endpoint (backend expects top-level fields)
        const phoneToSend =
          formData.phone_cell ||
          formData.phone_commercial ||
          formData.phone_residential ||
          formData.phone_additional ||
          ''

        const dataToSend: any = {
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
          // address fields as flat keys expected by backend
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          state: formData.state,
          city: formData.city,
          // single phone field
          phone: phoneToSend,
          // remuneration fields flat
          cargo: formData.cargo,
          beneficios: formData.beneficios,
          salary: formData.salary,
          receivesCommission: formData.receivesCommission === 'true',
          documents: formData.documents,
        }
        if (formData.password) dataToSend.password = formData.password
        await api.put(`/users/${editingUser.id}`, dataToSend)
        setToast({ message: 'Funcionário atualizado com sucesso!', type: 'success' })
        // Buscar o usuário completo do servidor para garantir todos os campos
        try {
          const fullRes = await api.get(`/users/${editingUser.id}`)
          const fullUser = fullRes.data
          setViewedUser(fullUser)
          // atualizar o formulário com os dados retornados para consistência
          setFormData((prev) => ({
            ...prev,
            name: fullUser.name || '',
            email: fullUser.email || '',
            role: fullUser.role || 'vendedor',
            admissionDate: (fullUser as any).admissionDate ? String((fullUser as any).admissionDate).split('T')[0] : '',
            dismissalDate: (fullUser as any).dismissalDate ? String((fullUser as any).dismissalDate).split('T')[0] : '',
            cpf: (fullUser as any).cpf || '',
            rg: (fullUser as any).rg || '',
            sexo: (fullUser as any).sexo || '',
            birthDate: (fullUser as any).birthDate ? String((fullUser as any).birthDate).split('T')[0] : '',
            ctps: (fullUser as any).ctps || '',
            cnh: (fullUser as any).cnh || '',
            cep: (fullUser as any).cep || '',
            street: (fullUser as any).street || '',
            number: (fullUser as any).number || '',
            complement: (fullUser as any).complement || '',
            neighborhood: (fullUser as any).neighborhood || '',
            state: (fullUser as any).state || '',
            city: (fullUser as any).city || '',
            cargo: (fullUser as any).cargo || '',
            beneficios: (fullUser as any).beneficios || '',
            salary: (fullUser as any).salary || '',
            receivesCommission: (fullUser as any).receivesCommission ? 'true' : 'false',
            documents: (fullUser as any).documents || []
          }))
        } catch (err) {
          console.warn('Não foi possível buscar usuário completo após update', err)
        }
        // Atualizar lista/estado com os dados mais recentes
        await loadUsers()
      } else {
        // Enviar criação com campos flat (backend espera campos no nível superior)
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
          cep: formData.cep,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          state: formData.state,
          city: formData.city,
          phone: formData.phone_cell || formData.phone_commercial || formData.phone_residential || formData.phone_additional || '',
          cargo: formData.cargo,
          beneficios: formData.beneficios,
          salary: formData.salary,
          receivesCommission: formData.receivesCommission === 'true',
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

  const handleEdit = async (user: User) => {
    try {
      // Buscar sempre o usuário completo para edição
      const res = await api.get(`/users/${user.id}`)
      const fullUser = res.data
      setEditingUser(fullUser)
      const u: any = fullUser
      setFormData((prev) => ({
        ...prev,
        name: u.name || '',
        email: u.email || '',
        password: '',
        role: u.role || 'vendedor',
        admissionDate: u.admissionDate ? String(u.admissionDate).split('T')[0] : '',
        dismissalDate: u.dismissalDate ? String(u.dismissalDate).split('T')[0] : '',
        cpf: u.cpf || '',
        rg: u.rg || '',
        sexo: u.sexo || '',
        birthDate: u.birthDate ? String(u.birthDate).split('T')[0] : '',
        ctps: u.ctps || '',
        cnh: u.cnh || '',
        cep: u.cep || '',
        street: u.street || '',
        number: u.number || '',
        complement: u.complement || '',
        neighborhood: u.neighborhood || '',
        state: u.state || '',
        city: u.city || '',
        phone_cell: u.phone || '',
        phone_commercial: u.phone || '',
        phone_residential: u.phone || '',
        phone_additional: u.phone || '',
        cargo: u.cargo || '',
        beneficios: u.beneficios || '',
        salary: u.salary ? String(u.salary) : '',
        receivesCommission: u.receivesCommission ? 'true' : 'false',
        documents: u.documents || [],
      }))
      setActiveStep(1)
      setShowModal(true)
    } catch (error: any) {
      console.error('Erro ao carregar dados do funcionário para edição:', error)
      setToast({ message: 'Erro ao carregar dados do funcionário para edição', type: 'error' })
    }
  }

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id)
    setShowConfirmModal(true)
  }

  const handleView = async (id: number) => {
    setLoadingView(true)
    try {
      const res = await api.get(`/users/${id}`)
      setViewedUser(res.data)
      setShowViewModal(true)
    } catch (error: any) {
      console.error('Erro ao carregar usuário:', error)
      setToast({ message: 'Erro ao carregar dados do usuário', type: 'error' })
    } finally {
      setLoadingView(false)
    }
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
      admissionDate: '',
      dismissalDate: '',
      cpf: '',
      rg: '',
      sexo: '',
      birthDate: '',
      ctps: '',
      cnh: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      state: '',
      city: '',
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
      cargo: '',
      beneficios: '',
      salary: '',
      receivesCommission: 'false',
      documents: [] as { name: string; url?: string }[],
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

  const formatDate = (d?: string | null) => {
    if (!d) return ''
    try {
      const dt = new Date(d)
      return dt.toLocaleDateString('pt-BR')
    } catch {
      return d
    }
  }

  const formatCPF = (cpf?: string | null) => {
    if (!cpf) return ''
    const digits = cpf.replace(/\D/g, '')
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const getPhone = (u: any) => {
    if (!u) return ''
    if (u.phone_cell) return u.phone_cell
    if (u.phone_commercial) return u.phone_commercial
    if (u.phone_residential) return u.phone_residential
    // try nested phones object
    const p = u.phones
    if (p?.cell?.number) return p.cell.number
    if (p?.commercial?.number) return p.commercial.number
    if (p?.residential?.number) return p.residential.number
    return ''
  }

  const getStatusLabel = (u: User) => {
    return u.dismissalDate ? 'Inativo' : 'Ativo'
  }

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-gray-600 mt-1">Gerencie funcionários e vendedores</p>
          </div>
          {user && (
            <button
              onClick={openModal}
              className="bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm"
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
          <>
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 max-h-[calc(100vh-220px)] flex flex-col">
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">Funcionário</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">Data admissão</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">Data demissão</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">CPF</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {totalResults === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-3 text-center text-gray-500">
                        Nenhum funcionário cadastrado
                      </td>
                    </tr>
                  ) : (
                    pageUsers.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-700">{userItem.id}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              {userItem.role === 'admin' ? (
                                <FiShield className="h-4 w-4 text-gray-600" />
                              ) : (
                                <FiUser className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                            <div>
                      <div className="text-sm font-medium text-gray-900 text-[13px]">{userItem.name}</div>
                              <div className="text-xs text-gray-500">{userItem.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">{formatDate((userItem as any).admissionDate)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">{formatDate((userItem as any).dismissalDate)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">{formatCPF((userItem as any).cpf)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">{getPhone(userItem)}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ (userItem as any).dismissalDate ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800' }`}>
                            {getStatusLabel(userItem)}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium space-x-2">
                          {user && (
                            <>
                              <button
                                onClick={() => handleView(userItem.id)}
                                className="text-gray-600 hover:text-gray-900 text-sm"
                                title="Visualizar"
                              >
                                <FiEye />
                              </button>
                              <button
                                onClick={() => handleEdit(userItem)}
                                className="inline-flex items-center gap-2 px-2 py-1 text-xs text-primary-600 hover:text-primary-900 border border-primary-100 rounded"
                                title="Editar"
                              >
                                <FiEdit />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeleteClick(userItem.id)}
                                disabled={deleting === userItem.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                title="Excluir"
                              >
                                {deleting === userItem.id ? (
                                  <div className="animate-spin h-3 w-3 border-2 border-red-600 border-t-transparent rounded-full"></div>
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

          {totalResults > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
              <div className="text-xs text-gray-600">
                Mostrando <span className="font-medium text-gray-900">{startIndex + 1}</span>–<span className="font-medium text-gray-900">{endIndexExclusive}</span> de{' '}
                <span className="font-medium text-gray-900">{totalResults}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                  aria-label="Itens por página"
                  title="Itens por página"
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={80}>80</option>
                  <option value={120}>120</option>
                </select>

                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={safePage <= 1}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
                >
                  Primeira
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
                >
                  Anterior
                </button>

                <div className="flex items-center gap-1">
                  {pagesToShow.map((p, idx) =>
                    p === -1 ? (
                      <span key={`e-${idx}`} className="px-2 text-sm text-gray-500">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`h-8 min-w-8 px-2 rounded-md text-sm border ${
                          p === safePage ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-current={p === safePage ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
                >
                  Próxima
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50"
                >
                  Última
                </button>
              </div>
            </div>
          )}
          </>
        ) : null}

        {/* Modal */}
        {showModal && user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4">
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
                          <input type="date" value={formData.admissionDate} onChange={(e)=>setFormData({...formData, admissionDate: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Data demissão</label>
                          <input type="date" value={formData.dismissalDate} onChange={(e)=>setFormData({...formData, dismissalDate: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input type="text" required value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                          <input type="text" value={formData.cpf} onChange={(e)=>setFormData({...formData, cpf: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">RG</label>
                          <input type="text" value={formData.rg} onChange={(e)=>setFormData({...formData, rg: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                          <select value={formData.sexo} onChange={(e)=>setFormData({...formData, sexo: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900">
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
                          <input type="date" value={formData.birthDate} onChange={(e)=>setFormData({...formData, birthDate: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CTPS</label>
                          <input type="text" value={formData.ctps} onChange={(e)=>setFormData({...formData, ctps: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CNH</label>
                          <input type="text" value={formData.cnh} onChange={(e)=>setFormData({...formData, cnh: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" required value={formData.email} onChange={(e)=>setFormData({...formData, email: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" disabled={!!editingUser} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}</label>
                        <input type="password" required={!editingUser} value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                        <select required value={formData.role} onChange={(e)=>setFormData({...formData, role: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900">
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
                        <input value={formData.cep} onChange={(e)=>setFormData({...formData, cep: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                        <input value={formData.street} onChange={(e)=>setFormData({...formData, street: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Nome da rua ou logradouro..." />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input value={formData.number} onChange={(e)=>setFormData({...formData, number: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Número" />
                        <input value={formData.complement} onChange={(e)=>setFormData({...formData, complement: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Complemento" />
                        <input value={formData.neighborhood} onChange={(e)=>setFormData({...formData, neighborhood: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Bairro" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={formData.state} onChange={(e)=>setFormData({...formData, state: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Estado" />
                        <input value={formData.city} onChange={(e)=>setFormData({...formData, city: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Cidade" />
                      </div>
                    </div>
                  )}

                  {/* Step 3 - Telefones */}
                  {activeStep === 3 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Celular (DDD)</label>
                          <input value={formData.phone_cell_dd} onChange={(e)=>setFormData({...formData, phone_cell_dd: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="DDD" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Celular (Número)</label>
                          <input value={formData.phone_cell} onChange={(e)=>setFormData({...formData, phone_cell: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Telefone" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Ramal</label>
                          <input value={formData.phone_cell_ram} onChange={(e)=>setFormData({...formData, phone_cell_ram: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" placeholder="Ramal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Comercial (DDD)</label>
                          <input value={formData.phone_commercial_dd} onChange={(e)=>setFormData({...formData, phone_commercial_dd: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Comercial (Número)</label>
                          <input value={formData.phone_commercial} onChange={(e)=>setFormData({...formData, phone_commercial: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Ramal</label>
                          <input value={formData.phone_commercial_ram} onChange={(e)=>setFormData({...formData, phone_commercial_ram: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Residencial (DDD)</label>
                          <input value={formData.phone_residential_dd} onChange={(e)=>setFormData({...formData, phone_residential_dd: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Residencial (Número)</label>
                          <input value={formData.phone_residential} onChange={(e)=>setFormData({...formData, phone_residential: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Ramal</label>
                          <input value={formData.phone_residential_ram} onChange={(e)=>setFormData({...formData, phone_residential_ram: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Fax (DDD/Número)</label>
                          <input value={formData.phone_fax} onChange={(e)=>setFormData({...formData, phone_fax: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Adicional / Recado</label>
                          <input value={formData.phone_additional} onChange={(e)=>setFormData({...formData, phone_additional: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4 - Remuneração */}
                  {activeStep === 4 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Cargo *</label>
                        <input value={formData.cargo} onChange={(e)=>setFormData({...formData, cargo: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">Benefícios</label>
                        <input value={formData.beneficios} onChange={(e)=>setFormData({...formData, beneficios: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Salário</label>
                          <input type="number" value={formData.salary} onChange={(e)=>setFormData({...formData, salary: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">Funcionário recebe comissão?</label>
                          <select value={formData.receivesCommission} onChange={(e)=>setFormData({...formData, receivesCommission: e.target.value})} className="w-full px-2 py-1.5 border rounded text-gray-900">
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
                      {activeStep > 1 && <button type="button" onClick={()=>setActiveStep(activeStep-1)} className="px-2 py-1 border rounded text-gray-700 text-sm">Anterior</button>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} disabled={saving} className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm">Cancelar</button>
                      {activeStep < 5 ? (
                        <button type="button" onClick={()=>setActiveStep(activeStep+1)} className="px-3 py-1.5 bg-primary-600 text-white rounded-md text-sm">Próximo</button>
                      ) : (
                        <button type="submit" disabled={saving} className="px-3 py-1.5 bg-primary-600 text-white rounded-md flex items-center text-sm">
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
        {/* Modal Visualizar Usuário - organizado */}
        {showViewModal && viewedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Funcionário — {viewedUser.name}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowViewModal(false); setViewedUser(null) }} className="px-3 py-1 text-sm border rounded text-gray-700 hover:bg-gray-50">Fechar</button>
                  <button onClick={() => { setShowViewModal(false); handleEdit(viewedUser) }} className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700">Editar</button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Header com avatar e infos básicas */}
                <div className="flex gap-4 items-center">
                  <div className="h-20 w-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    { (viewedUser as any).avatar ? (
                      <img src={(viewedUser as any).avatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-gray-400">{viewedUser.name?.charAt(0) || 'U'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{viewedUser.name}</div>
                    <div className="text-sm text-gray-600">{viewedUser.email}</div>
                    <div className="text-xs text-gray-500 mt-1">Cargo: {getRoleLabel(viewedUser.role)}</div>
                  </div>
                </div>

                {/* Dados Pessoais */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">CPF</label>
                      <div className="text-sm text-gray-900">{formatCPF((viewedUser as any).cpf) || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">RG</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).rg || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Sexo</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).sexo || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Data de Nascimento</label>
                      <div className="text-sm text-gray-900">{formatDate((viewedUser as any).birthDate) || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">CTPS</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).ctps || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">CNH</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).cnh || '-'}</div>
                    </div>
                  </div>
                </section>

                {/* Contato */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Telefone</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).phone || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Email</label>
                      <div className="text-sm text-gray-900">{viewedUser.email || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Criado em</label>
                      <div className="text-sm text-gray-900">{new Date(viewedUser.createdAt).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                </section>

                {/* Endereço */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">CEP</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).cep || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Logradouro</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).street || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Número / Complemento</label>
                      <div className="text-sm text-gray-900">{((viewedUser as any).number || '-') + ( (viewedUser as any).complement ? ` / ${ (viewedUser as any).complement}` : '' )}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Bairro</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).neighborhood || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Cidade / Estado</label>
                      <div className="text-sm text-gray-900">{((viewedUser as any).city || '-') + ' / ' + ((viewedUser as any).state || '-')}</div>
                    </div>
                  </div>
                </section>

                {/* Remuneração */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Remuneração</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600">Cargo</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).cargo || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Benefícios</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).beneficios || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Salário</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).salary ? `R$ ${(viewedUser as any).salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Recebe comissão?</label>
                      <div className="text-sm text-gray-900">{(viewedUser as any).receivesCommission ? 'Sim' : 'Não'}</div>
                    </div>
                  </div>
                </section>

                {/* Documentos */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Documentos</h3>
                  {Array.isArray((viewedUser as any).documents) ? (
                    (viewedUser as any).documents.length > 0 ? (
                      <ul className="space-y-2">
                        {(viewedUser as any).documents.map((doc: any, idx: number) => (
                          <li key={idx} className="text-sm text-gray-900">
                            {doc.name || doc.filename || `Documento ${idx + 1}`}
                            {doc.url ? (
                              <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary-600 ml-2 hover:underline">Abrir</a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-gray-500">Nenhum documento anexado.</div>
                    )
                  ) : (viewedUser as any).documents ? (
                    <div className="text-sm text-gray-900">{String((viewedUser as any).documents)}</div>
                  ) : (
                    <div className="text-sm text-gray-500">-</div>
                  )}
                </section>

                {/* Vendas vinculadas removidas do modal de visualização */}
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


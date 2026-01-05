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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
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
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }
        if (formData.password) {
          dataToSend.password = formData.password
        }
        await api.put(`/users/${editingUser.id}`, dataToSend)
        setToast({ message: 'Funcionário atualizado com sucesso!', type: 'success' })
      } else {
        await api.post('/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
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
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      disabled={!!editingUser}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                      placeholder={editingUser ? 'Deixe vazio para manter a senha atual' : 'Mínimo 6 caracteres'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                    >
                      <option value="vendedor">Vendedor</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Vendedor: Pode criar vendas e gerenciar clientes | Gerente: Pode gerenciar tudo exceto usuários | Admin: Acesso total
                    </p>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingUser(null)
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


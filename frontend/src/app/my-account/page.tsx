'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import Layout from '@/components/Layout'
import { FiUser, FiMail, FiCamera, FiSave, FiX, FiLock } from 'react-icons/fi'

export default function MyAccountPage() {
  const router = useRouter()
  const { user: authUser, setUser, logout } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: ''
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showAvatarGallery, setShowAvatarGallery] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({ new: '', confirm: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  
  // Lista de avatares genéricos (sem fotos de pessoas)
  const defaultAvatars = [
    'https://ui-avatars.com/api/?name=AA&background=6366f1&color=fff&size=128',
    'https://ui-avatars.com/api/?name=BB&background=8b5cf6&color=fff&size=128',
    'https://ui-avatars.com/api/?name=CC&background=ec4899&color=fff&size=128',
    'https://ui-avatars.com/api/?name=DD&background=f59e0b&color=fff&size=128',
    'https://ui-avatars.com/api/?name=EE&background=10b981&color=fff&size=128',
    'https://ui-avatars.com/api/?name=FF&background=06b6d4&color=fff&size=128',
    'https://ui-avatars.com/api/?name=GG&background=3b82f6&color=fff&size=128',
    'https://ui-avatars.com/api/?name=HH&background=ef4444&color=fff&size=128',
    'https://ui-avatars.com/api/?name=II&background=14b8a6&color=fff&size=128',
    'https://ui-avatars.com/api/?name=JJ&background=a855f7&color=fff&size=128',
    'https://ui-avatars.com/api/?name=KK&background=f97316&color=fff&size=128',
    'https://ui-avatars.com/api/?name=LL&background=22c55e&color=fff&size=128',
    'https://ui-avatars.com/api/?name=MM&background=0ea5e9&color=fff&size=128',
    'https://ui-avatars.com/api/?name=NN&background=6366f1&color=fff&size=128',
    'https://ui-avatars.com/api/?name=OO&background=8b5cf6&color=fff&size=128',
    'https://ui-avatars.com/api/?name=PP&background=ec4899&color=fff&size=128',
    'https://ui-avatars.com/api/?name=QQ&background=f59e0b&color=fff&size=128',
    'https://ui-avatars.com/api/?name=RR&background=10b981&color=fff&size=128',
    'https://ui-avatars.com/api/?name=SS&background=06b6d4&color=fff&size=128',
    'https://ui-avatars.com/api/?name=TT&background=3b82f6&color=fff&size=128',
    'https://ui-avatars.com/api/?name=UU&background=ef4444&color=fff&size=128',
    'https://ui-avatars.com/api/?name=VV&background=14b8a6&color=fff&size=128',
    'https://ui-avatars.com/api/?name=WW&background=a855f7&color=fff&size=128',
    'https://ui-avatars.com/api/?name=XX&background=f97316&color=fff&size=128',
  ]

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/me')
      const userData = response.data
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        avatar: userData.avatar || ''
      })
      if (userData.avatar) {
        setAvatarPreview(userData.avatar)
      }
      
      // Atualizar o store com os dados do perfil
      if (authUser) {
        setUser({
          name: userData.name,
          email: userData.email,
          phone: userData.phone || undefined,
          avatar: userData.avatar || undefined
        })
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error)
      setToast({ message: 'Erro ao carregar perfil', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await api.put('/users/me', {
        name: formData.name,
        email: formData.email
      })
      
      // Atualizar o usuário no store
      if (authUser) {
        setUser({
          ...authUser,
          name: response.data.user.name,
          email: response.data.user.email
        })
      }
      
      setToast({ message: 'Perfil atualizado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error)
      setToast({ 
        message: error.response?.data?.error || 'Erro ao atualizar perfil', 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      setToast({ message: 'Nova senha e confirmação não conferem.', type: 'error' })
      return
    }
    if (passwordData.new.length < 6) {
      setToast({ message: 'A nova senha deve ter no mínimo 6 caracteres.', type: 'error' })
      return
    }
    setSavingPassword(true)
    try {
      await api.put('/users/me', { password: passwordData.new })
      setToast({ message: 'Senha alterada com sucesso!', type: 'success' })
      setShowPasswordModal(false)
      setPasswordData({ new: '', confirm: '' })
    } catch (error: any) {
      setToast({ message: error.response?.data?.error || 'Erro ao alterar senha', type: 'error' })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleAvatarSelect = async (avatar: string) => {
    setShowAvatarGallery(false)
    setSaving(true)
    
    try {
      const response = await api.put('/users/me/avatar', {
        avatar: avatar
      })
      
      // Atualizar o usuário no store
      if (authUser) {
        setUser({
          ...authUser,
          avatar: response.data.user.avatar
        })
      }
      
      setAvatarPreview(response.data.user.avatar)
      setFormData(prev => ({ ...prev, avatar: response.data.user.avatar }))
      
      setToast({ message: 'Avatar atualizado com sucesso!', type: 'success' })
    } catch (error: any) {
      console.error('Erro ao atualizar avatar:', error)
      setToast({ 
        message: error.response?.data?.error || 'Erro ao atualizar avatar', 
        type: 'error' 
      })
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="p-4 max-w-4xl mx-auto min-h-full bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Minha Conta</h1>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
            >
              <FiLock className="w-4 h-4" />
              Alterar senha
            </button>
          </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-4 p-3 rounded ${
              toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Avatar Section */}
        <div className="mb-8 flex items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
              {avatarPreview ? (
                avatarPreview.startsWith('data:image') || avatarPreview.startsWith('http') ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl">{avatarPreview}</span>
                )
              ) : (
                <FiUser className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarGallery(true)}
              className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2 cursor-pointer hover:bg-primary-700 transition shadow-lg"
              title="Escolher avatar"
            >
              <FiCamera className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{formData.name}</h2>
            <p className="text-gray-600">{formData.email}</p>
            <p className="text-sm text-gray-500 mt-1">Clique no ícone para escolher um avatar</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <FiX className="w-5 h-5" />
              Fechar
            </button>
          </div>
        </form>
      </div>

      {/* Avatar Gallery Modal */}
      {showAvatarGallery && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAvatarGallery(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto relative shadow-2xl border-2 border-gray-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAvatarGallery(false)}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition shadow-lg"
              title="Fechar"
            >
              <FiX className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 pr-12">Escolher Avatar</h3>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
              {defaultAvatars.map((avatar, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAvatarSelect(avatar)}
                  className="w-full aspect-square rounded-full overflow-hidden border-2 border-gray-300 hover:border-primary-500 transition hover:scale-105"
                >
                  <img
                    src={avatar}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAvatarGallery(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal Alterar senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Alterar senha</h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.new}
                  onChange={e => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordData.confirm}
                  onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900"
                  placeholder="Repita a nova senha"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingPassword ? 'Salvando...' : 'Alterar senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </Layout>
  )
}

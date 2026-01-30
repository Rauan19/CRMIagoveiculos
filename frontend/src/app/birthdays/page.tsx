'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { FiGift, FiCalendar, FiMail, FiPhone, FiUser, FiClock } from 'react-icons/fi'
import Toast from '@/components/Toast'

interface BirthdayCustomer {
  id: number
  name: string
  email: string | null
  phone: string
  birthDate: string
  daysUntilBirthday: number
  nextBirthdayDate: string
}

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<BirthdayCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(30)
  const [currentMonthBirthdays, setCurrentMonthBirthdays] = useState<BirthdayCustomer[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    loadBirthdays()
    loadCurrentMonthBirthdays()
  }, [daysFilter])

  const loadBirthdays = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/customers/birthdays/upcoming?days=${daysFilter}`)
      setBirthdays(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar aniversários:', error)
      setToast({ message: 'Erro ao carregar aniversários.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentMonthBirthdays = async () => {
    try {
      const response = await api.get(`/customers/birthdays/upcoming?days=31`)
      const today = new Date()
      const currentMonth = today.getMonth()
      
      const thisMonth = (response.data || []).filter((customer: BirthdayCustomer) => {
        const birthdayDate = new Date(customer.nextBirthdayDate)
        return birthdayDate.getMonth() === currentMonth
      })
      
      setCurrentMonthBirthdays(thisMonth)
    } catch (error) {
      console.error('Erro ao carregar aniversários do mês:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
    })
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit'
    })
  }

  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Hoje! 🎉'
    if (days === 1) return 'Amanhã'
    return `Em ${days} dias`
  }

  const getBirthdayStatus = (days: number) => {
    if (days === 0) return 'bg-pink-100 text-pink-800 border-pink-300'
    if (days <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const groupByDays = (customers: BirthdayCustomer[]) => {
    const groups: { [key: number]: BirthdayCustomer[] } = {}
    
    customers.forEach(customer => {
      const days = customer.daysUntilBirthday
      if (!groups[days]) {
        groups[days] = []
      }
      groups[days].push(customer)
    })
    
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(days => ({ days, customers: groups[days] }))
  }

  const groupedBirthdays = groupByDays(birthdays)

  return (
    <Layout>
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiGift className="text-pink-600" />
              Aniversários
            </h1>
            <p className="text-sm text-gray-600 mt-1">Gerencie e acompanhe os aniversários dos clientes</p>
          </div>
          
          {/* Filtro de dias */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 font-medium">Próximos:</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Aniversários do Mês</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentMonthBirthdays.length}
                </p>
              </div>
              <div className="p-3 bg-pink-50 rounded-lg">
                <FiCalendar className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Próximos {daysFilter} dias</p>
                <p className="text-2xl font-bold text-gray-900">
                  {birthdays.length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiClock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Hoje</p>
                <p className="text-2xl font-bold text-gray-900">
                  {birthdays.filter(b => b.daysUntilBirthday === 0).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <FiGift className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Carregando aniversários...</p>
            </div>
          </div>
        ) : birthdays.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <FiGift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Nenhum aniversário encontrado</p>
            <p className="text-sm text-gray-600">
              Não há aniversários nos próximos {daysFilter} dias.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedBirthdays.map(({ days, customers }) => (
              <div key={days} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className={`px-6 py-4 border-b ${getBirthdayStatus(days)}`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <FiCalendar className="text-lg" />
                      {getDaysUntilText(days)}
                    </h2>
                    <span className="text-sm font-medium">
                      {customers.length} {customers.length === 1 ? 'aniversariante' : 'aniversariantes'}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <div key={customer.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-pink-100 rounded-lg">
                              <FiUser className="h-5 w-5 text-pink-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {customer.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {formatDate(customer.nextBirthdayDate)} • {calculateAge(customer.birthDate)} anos
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                          {customer.email && (
                            <a
                              href={`mailto:${customer.email}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <FiMail className="h-4 w-4" />
                              Email
                            </a>
                          )}
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                          >
                            <FiPhone className="h-4 w-4" />
                            Ligar
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  )
}

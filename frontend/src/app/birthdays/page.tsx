'use client'

import { useState, useEffect, useMemo } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { FiGift, FiCalendar, FiMail, FiPhone, FiUser, FiClock } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
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

const UPCOMING_FETCH_LIMIT = 500

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState<BirthdayCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(30)
  const [currentMonthBirthdays, setCurrentMonthBirthdays] = useState<BirthdayCustomer[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const loadUpcomingBirthdays = async () => {
    const response = await api.get(
      `/customers/birthdays/upcoming?days=${daysFilter}&offset=0&limit=${UPCOMING_FETCH_LIMIT}`
    )
    const data = response.data || { items: [], total: 0 }
    const items: BirthdayCustomer[] = data.items || []
    setBirthdays(items)
  }

  const loadCurrentMonthBirthdays = async () => {
    const response = await api.get('/customers')
    const today = new Date()
    const currentMonth = today.getMonth()
    const customers = response.data || []
    const thisMonth = customers
      .filter((c: any) => c.birthDate)
      .map((c: any) => {
        const birth = new Date(c.birthDate)
        const birthMonth = birth.getMonth()
        const birthDay = birth.getDate()
        const nextBirthdayDate = new Date(today.getFullYear(), birthMonth, birthDay)
        return {
          id: c.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || '',
          birthDate: c.birthDate,
          daysUntilBirthday: Math.floor(
            (nextBirthdayDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          nextBirthdayDate: nextBirthdayDate.toISOString(),
        } as BirthdayCustomer
      })
      .filter((c: BirthdayCustomer) => {
        const d = new Date(c.birthDate)
        return d.getMonth() === currentMonth
      })
    setCurrentMonthBirthdays(thisMonth)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setBirthdays([])
      try {
        await Promise.all([loadUpcomingBirthdays(), loadCurrentMonthBirthdays()])
      } catch (error) {
        console.error('Erro ao carregar aniversários:', error)
        if (!cancelled) setToast({ message: 'Erro ao carregar aniversários.', type: 'error' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysFilter])

  useEffect(() => {
    setPage(1)
  }, [currentMonthBirthdays.length, pageSize])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Hoje! 🎉'
    if (days === 1) return 'Amanhã'
    return `Em ${days} dias`
  }

  const getBirthdayStatus = (days: number) => {
    if (days < 0) return 'bg-gray-50 text-gray-700 border-gray-200'
    if (days === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (days <= 7) return 'bg-yellow-50 text-yellow-800 border-yellow-300'
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

  const groupByDayOfMonth = (customers: BirthdayCustomer[]) => {
    const groups: { [day: number]: BirthdayCustomer[] } = {}
    customers.forEach((c) => {
      const d = new Date(c.nextBirthdayDate || c.birthDate)
      const day = d.getDate()
      if (!groups[day]) groups[day] = []
      groups[day].push(c)
    })
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map((day) => ({ day, customers: groups[day] }))
  }

  const displayedList = currentMonthBirthdays
  const groupedBirthdays = useMemo(() => groupByDayOfMonth(displayedList), [displayedList])

  const totalGroupCount = groupedBirthdays.length
  const totalPages = Math.max(1, Math.ceil(totalGroupCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = totalGroupCount === 0 ? 0 : (safePage - 1) * pageSize
  const endIndexExclusive = Math.min(startIndex + pageSize, totalGroupCount)
  const pageGroups = groupedBirthdays.slice(startIndex, endIndexExclusive)

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
    const arr = Array.from(pages)
      .filter((p) => p >= 1 && p <= total)
      .sort((a, b) => a - b)
    const out: Array<number> = []
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i]
      const prev = arr[i - 1]
      if (i > 0 && prev != null && p - prev > 1) out.push(-1)
      out.push(p)
    }
    return out
  }, [safePage, totalPages])

  return (
    <Layout>
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiGift className="text-yellow-600" />
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
                <p className="text-2xl font-bold text-gray-900">{currentMonthBirthdays.length}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <FiCalendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Próximos {daysFilter} dias</p>
                <p className="text-2xl font-bold text-gray-900">{birthdays.length}</p>
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
                  {birthdays.filter((b) => b.daysUntilBirthday === 0).length}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <FiGift className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Aniversariantes do mês (resumo) */}
        {currentMonthBirthdays.length > 0 && (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Aniversariantes deste mês</h3>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {currentMonthBirthdays.map((c) => (
                <div key={c.id} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded-md">
                  {formatShortDate(c.nextBirthdayDate)} — {c.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Carregando aniversários...</p>
            </div>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
            <FiGift className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-base font-medium text-gray-900 mb-1">Nenhum aniversariante neste mês</p>
            <p className="text-xs text-gray-600">Não há aniversariantes para o mês atual.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {pageGroups.map(({ day, customers }) => {
                const daysUntil = customers?.[0]?.daysUntilBirthday ?? 999
                const month = String(
                  new Date(customers?.[0]?.nextBirthdayDate || customers?.[0]?.birthDate).getMonth() + 1
                ).padStart(2, '0')

                return (
                  <div key={day} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div className={`px-6 py-4 border-b ${getBirthdayStatus(daysUntil)}`}>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <FiCalendar className="text-lg" />
                          <span className="text-sm font-medium">
                            {String(day).padStart(2, '0')}/{month}
                          </span>
                        </h2>
                        <span className="text-sm font-medium">
                          {customers.length} {customers.length === 1 ? 'aniversariante' : 'aniversariantes'}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {customers.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 hover:bg-gray-50 transition-colors flex items-center justify-between flex-wrap gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded text-sm">
                              <FiUser className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                              <div className="text-xs text-gray-500">
                                {formatShortDate(customer.nextBirthdayDate)} • {calculateAge(customer.birthDate)} anos
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                className="text-xs text-gray-700 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-1"
                              >
                                <FiMail className="h-3 w-3" /> {customer.email}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 px-2 py-1">—</span>
                            )}

                            {customer.phone ? (
                              <>
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="text-xs text-primary-700 px-2 py-1 rounded bg-primary-50 hover:bg-primary-100 flex items-center gap-1"
                                >
                                  <FiPhone className="h-3 w-3" /> {customer.phone}
                                </a>
                                <a
                                  href={`https://wa.me/${(customer.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Olá ${customer.name}! Toda a equipe da Iago Veículos deseja a você um feliz aniversário 🎉 Que seu dia seja incrível!`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded flex items-center gap-1 hover:bg-green-700"
                                  title="Enviar WhatsApp"
                                >
                                  <FaWhatsapp className="h-3 w-3" />
                                </a>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 px-2 py-1">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {totalGroupCount > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="text-xs text-gray-600">
                  Dias do mês:{' '}
                  <span className="font-medium text-gray-900">{startIndex + 1}</span>–
                  <span className="font-medium text-gray-900">{endIndexExclusive}</span> de{' '}
                  <span className="font-medium text-gray-900">{totalGroupCount}</span> (blocos por dia)
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 hidden sm:inline">Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                    aria-label="Itens por página"
                    title="Quantidade de blocos (dias) por página"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={40}>40</option>
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
                            p === safePage
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
        )}

        {/* Toast */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </Layout>
  )
}

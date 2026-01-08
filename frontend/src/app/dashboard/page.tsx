'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/services/api'
import { FiUsers, FiTruck, FiDollarSign, FiTrendingUp, FiShoppingCart, FiCalendar } from 'react-icons/fi'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardStats {
  customers: {
    total: number
  }
  vehicles: {
    total: number
    disponivel: number
    reservado: number
    vendido: number
  }
  sales: {
    total: number
    revenue: number
    profit: number
  }
  chartData: Array<{
    date: string
    revenue: number
    profit: number
    count: number
  }>
}

type PeriodType = 'all' | 'day' | 'week' | 'month' | 'year'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadStats()
  }, [period, startDate, endDate, useCustomDate])

  // Fechar calendário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showCalendar && !target.closest('.calendar-container')) {
        setShowCalendar(false)
      }
    }
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  const loadStats = async () => {
    setLoading(true)
    try {
      let url = `/reports/dashboard?period=${period}`
      if (useCustomDate && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      }
      const response = await api.get(url)
      setStats(response.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod)
    setUseCustomDate(false)
    setStartDate('')
    setEndDate('')
    setShowCalendar(false)
  }

  const handleCustomDateChange = () => {
    setUseCustomDate(true)
    setPeriod('all')
    setShowCalendar(true)
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const formatDateForDisplay = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(calendarYear, calendarMonth, day)
    const dateString = selectedDate.toISOString().split('T')[0]
    
    if (!startDate || (startDate && endDate)) {
      // Se não tem data inicial ou já tem ambas, começar nova seleção
      setStartDate(dateString)
      setEndDate('')
    } else if (startDate && !endDate) {
      // Se já tem data inicial, definir data final
      if (new Date(dateString) >= new Date(startDate)) {
        setEndDate(dateString)
      } else {
        // Se a data selecionada é anterior à inicial, trocar
        setEndDate(startDate)
        setStartDate(dateString)
      }
    }
  }

  const isDateInRange = (day: number) => {
    if (!startDate) return false
    const date = new Date(calendarYear, calendarMonth, day)
    const dateString = date.toISOString().split('T')[0]
    
    if (endDate) {
      return dateString >= startDate && dateString <= endDate
    }
    return dateString === startDate
  }

  const isDateSelected = (day: number) => {
    const date = new Date(calendarYear, calendarMonth, day)
    const dateString = date.toISOString().split('T')[0]
    return dateString === startDate || dateString === endDate
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (calendarMonth === 0) {
        setCalendarMonth(11)
        setCalendarYear(calendarYear - 1)
      } else {
        setCalendarMonth(calendarMonth - 1)
      }
    } else {
      if (calendarMonth === 11) {
        setCalendarMonth(0)
        setCalendarYear(calendarYear + 1)
      } else {
        setCalendarMonth(calendarMonth + 1)
      }
    }
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value)
  }

  const periodLabels: Record<PeriodType, string> = {
    all: 'Todos',
    day: 'Hoje',
    week: 'Semana',
    month: 'Mês',
    year: 'Ano'
  }

  return (
    <Layout>
      <div className="bg-gray-50 p-4 lg:p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Visão geral do negócio</p>
          </div>
          
          {/* Filtros de Período */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-600" />
              <div className="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
                {(['day', 'week', 'month', 'year', 'all'] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      period === p && !useCustomDate
                        ? 'bg-primary-600 text-white'
                        : useCustomDate
                        ? 'text-gray-500 hover:bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Seletor de Data Personalizado */}
            <div className="relative calendar-container">
              <button
                onClick={() => {
                  if (!useCustomDate) {
                    handleCustomDateChange()
                  } else {
                    setShowCalendar(!showCalendar)
                  }
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  useCustomDate
                    ? 'bg-primary-50 border-primary-300 text-primary-700 hover:bg-primary-100'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FiCalendar className={useCustomDate ? 'text-primary-600' : 'text-gray-600'} />
                <span className="text-xs font-medium">
                  {useCustomDate && startDate
                    ? `${formatDateForDisplay(startDate)}${endDate ? ` - ${formatDateForDisplay(endDate)}` : ''}`
                    : 'Escolher Data'
                  }
                </span>
              </button>

              {showCalendar && useCustomDate && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-80 calendar-container">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-semibold text-gray-900">
                      {monthNames[calendarMonth]} {calendarYear}
                    </h3>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDayOfMonth(calendarMonth, calendarYear) }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square"></div>
                    ))}
                    {Array.from({ length: getDaysInMonth(calendarMonth, calendarYear) }).map((_, i) => {
                      const day = i + 1
                      const isSelected = isDateSelected(day)
                      const inRange = isDateInRange(day)
                      const isToday = new Date().toDateString() === new Date(calendarYear, calendarMonth, day).toDateString()
                      
                      return (
                        <button
                          key={day}
                          onClick={() => handleDateSelect(day)}
                          className={`aspect-square text-sm rounded transition-colors ${
                            isSelected
                              ? 'bg-primary-600 text-white font-semibold'
                              : inRange
                              ? 'bg-primary-100 text-primary-700'
                              : isToday
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>

                  {(startDate || endDate) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={() => {
                          setStartDate('')
                          setEndDate('')
                        }}
                        className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Limpar
                      </button>
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-600">Carregando...</p>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Cards Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total de Clientes */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Clientes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.customers.total}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <FiUsers className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Total de Veículos */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Veículos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.vehicles.total}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <FiTruck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Total de Vendas */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Vendas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.sales.total}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <FiShoppingCart className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Lucro Total */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Lucro</p>
                    <p className={`text-xl font-bold ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stats.sales.profit || 0)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${(stats.sales.profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <FiTrendingUp className={`h-6 w-6 ${(stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Receita e Lucro */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FiTrendingUp className="text-primary-600" />
                    Receita e Lucro ao Longo do Tempo
                  </h2>
                  {stats.chartData && stats.chartData.length > 0 && (
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Média Receita:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(stats.chartData.reduce((sum, d) => sum + d.revenue, 0) / stats.chartData.length)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">Média Lucro:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(stats.chartData.reduce((sum, d) => sum + d.profit, 0) / stats.chartData.length)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {stats.chartData && stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={stats.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6B7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#6B7280' }}
                      />
                      <YAxis 
                        stroke="#6B7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#6B7280' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                          return `R$ ${value}`;
                        }}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === 'revenue' ? 'Receita' : name === 'profit' ? 'Lucro' : name
                        ]}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          padding: '10px'
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '6px', color: '#111827', fontSize: '12px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '15px' }}
                        iconType="line"
                        formatter={(value) => value === 'revenue' ? 'Receita' : value === 'profit' ? 'Lucro' : value}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        name="revenue"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        name="profit"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-gray-500">
                    <div className="text-center">
                      <FiTrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Nenhum dado disponível para o período selecionado</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico de Quantidade de Vendas */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FiShoppingCart className="text-primary-600" />
                    Quantidade de Vendas por Período
                  </h2>
                  {stats.chartData && stats.chartData.length > 0 && (
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Total de Vendas:</span>
                        <span className="font-semibold text-gray-900">
                          {stats.chartData.reduce((sum, d) => sum + d.count, 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Média por Período:</span>
                        <span className="font-semibold text-gray-900">
                          {(stats.chartData.reduce((sum, d) => sum + d.count, 0) / stats.chartData.length).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {stats.chartData && stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={stats.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6B7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#6B7280' }}
                      />
                      <YAxis 
                        stroke="#6B7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tick={{ fill: '#6B7280' }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value} vendas`, 'Quantidade']}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E5E7EB', 
                          borderRadius: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          padding: '10px'
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '6px', color: '#111827', fontSize: '12px' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#6366F1" 
                        name="Vendas" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-gray-500">
                    <div className="text-center">
                      <FiShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Nenhum dado disponível para o período selecionado</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Receita e Financeiro */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="mb-3">
                <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <FiDollarSign className="text-primary-600 text-sm" />
                  Análise Financeira Detalhada
                </h2>
                <p className="text-xs text-gray-500">Período: {periodLabels[period]}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Receita Total</p>
                        <FiDollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="text-xl font-bold text-blue-700 mb-0.5">
                        {formatCurrency(stats.sales.revenue)}
                      </p>
                      <p className="text-xs text-blue-600">
                        {stats.sales.total} {stats.sales.total === 1 ? 'venda realizada' : 'vendas realizadas'}
                      </p>
                    </div>
                    {stats.sales.total > 0 && (
                      <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Ticket Médio</p>
                          <FiShoppingCart className="h-4 w-4 text-purple-600" />
                        </div>
                        <p className="text-xl font-bold text-purple-700 mb-0.5">
                          {formatCurrency(stats.sales.revenue / stats.sales.total)}
                        </p>
                        <p className="text-xs text-purple-600">
                          Valor médio por venda
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border shadow-sm ${
                      (stats.sales.profit || 0) >= 0 
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
                        : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${
                          (stats.sales.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          Lucro Total
                        </p>
                        <FiTrendingUp className={`h-4 w-4 ${
                          (stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <p className={`text-xl font-bold mb-0.5 ${
                        (stats.sales.profit || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(stats.sales.profit || 0)}
                      </p>
                      <p className={`text-xs ${
                        (stats.sales.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stats.sales.revenue > 0 
                          ? `${((stats.sales.profit / stats.sales.revenue) * 100).toFixed(1)}% da receita`
                          : 'Sem receita registrada'
                        }
                      </p>
                    </div>
                    {stats.sales.total > 0 && stats.sales.revenue > 0 && (
                      <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Margem de Lucro</p>
                          <FiTrendingUp className="h-4 w-4 text-gray-600" />
                        </div>
                        <p className="text-xl font-bold text-gray-700 mb-0.5">
                          {((stats.sales.profit / stats.sales.revenue) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600">
                          {((stats.sales.profit / stats.sales.revenue) * 100) >= 20 
                            ? 'Excelente margem' 
                            : ((stats.sales.profit / stats.sales.revenue) * 100) >= 10
                            ? 'Boa margem'
                            : 'Margem baixa'
                          }
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 text-center">
            <p className="text-sm text-gray-600">Não foi possível carregar as estatísticas</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

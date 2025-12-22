'use client'

import Layout from '@/components/Layout'

export default function DashboardPage() {
  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <p className="text-gray-600">Bem-vindo ao CRM IAGO Veículos</p>
          
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-gray-500">Clientes</div>
                  </div>
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">-</div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-gray-500">Veículos</div>
                  </div>
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">-</div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-gray-500">Vendas</div>
                  </div>
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">-</div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-sm font-medium text-gray-500">Receita</div>
                  </div>
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">-</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

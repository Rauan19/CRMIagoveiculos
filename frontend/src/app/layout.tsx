import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IAGO CRM - Gestão de Veículos',
  description: 'Sistema completo de gestão para loja de veículos - Controle de vendas, clientes, estoque e financeiro',
  icons: {
    icon: '/logo/logo2-Photoroom.png',
    apple: '/logo/logo2-Photoroom.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove atributos adicionados por extensões do navegador (ex: ColorZilla)
              if (typeof document !== 'undefined') {
                document.addEventListener('DOMContentLoaded', function() {
                  document.body?.removeAttribute('cz-shortcut-listen');
                  document.documentElement?.removeAttribute('cz-shortcut-listen');
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}



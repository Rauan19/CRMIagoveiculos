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
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove atributos adicionados por extensões do navegador antes da hidratação
              if (typeof window !== 'undefined') {
                document.addEventListener('DOMContentLoaded', function() {
                  const body = document.body;
                  const html = document.documentElement;
                  if (body) body.removeAttribute('cz-shortcut-listen');
                  if (html) html.removeAttribute('cz-shortcut-listen');
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}



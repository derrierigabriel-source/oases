import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Perfumes App — Gestão de Vendas',
  description: 'Sistema de gestão de vendas de perfumes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#242220',
              color: '#e8e4de',
              border: '1px solid #2e2c29',
              borderRadius: '8px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#f59e0b',
                secondary: '#0f0e0c',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0f0e0c',
              },
            },
          }}
        />
      </body>
    </html>
  )
}

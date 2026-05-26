import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kanban',
  description: 'Gestión de tareas con tableros Kanban',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen" style={{ background: '#09090b', color: '#fafafa' }}>
        {children}
      </body>
    </html>
  )
}

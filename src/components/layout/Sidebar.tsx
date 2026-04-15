'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  CreditCard,
  LogOut,
  FlaskConical,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/estoque', label: 'Estoque', icon: Package },
  { href: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/pagamentos', label: 'Pagamentos', icon: CreditCard },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { vendedor, signOut } = useAuth()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-brand-surface border-r border-brand-border">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-gold flex items-center justify-center">
              <FlaskConical size={16} className="text-black" />
            </div>
            <div>
              <span className="font-display font-semibold text-brand-text text-base leading-none">
                Perfumes
              </span>
              <p className="text-xs text-brand-muted mt-0.5">Gestão de Vendas</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${
                    active
                      ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20'
                      : 'text-brand-text-dim hover:text-brand-text hover:bg-brand-card'
                  }
                `}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-brand-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-sm font-semibold">
              {vendedor?.nome?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-text truncate">
                {vendedor?.nome ?? 'Carregando...'}
              </p>
              <p className="text-xs text-brand-muted capitalize">
                {vendedor?.perfil ?? ''}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-red-400 hover:bg-red-900/10 transition-all"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-surface border-t border-brand-border flex items-center justify-around px-2 py-2 safe-area-pb">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-0
                ${active ? 'text-brand-gold' : 'text-brand-muted hover:text-brand-text-dim'}
              `}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

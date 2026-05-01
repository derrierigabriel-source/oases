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
  Gem,
  Archive,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/estoque', label: 'Estoque', icon: Package, adminOnly: false },
  { href: '/vendas', label: 'Vendas', icon: ShoppingBag, adminOnly: false },
  { href: '/clientes', label: 'Clientes', icon: Users, adminOnly: false },
  { href: '/pagamentos', label: 'Pagamentos', icon: CreditCard, adminOnly: false },
  { href: '/lotes', label: 'Lotes', icon: Archive, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, vendedor, isAdmin, profileLoading, signOut } = useAuth()

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin || profileLoading)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-brand-surface border-r border-brand-border oases-pattern">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-brand-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
              <Gem size={16} className="text-brand-gold" />
            </div>
            <div>
              <span className="font-display font-semibold text-brand-gold text-lg tracking-widest leading-none">
                OASES
              </span>
              <p className="text-[10px] text-brand-muted mt-0.5 tracking-wider uppercase">
                Gestão de Vendas
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {visibleItems.map(({ href, label, icon: Icon, adminOnly }) => {
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
                      : 'text-brand-text-dim hover:text-brand-text hover:bg-brand-card border border-transparent'
                  }
                `}
              >
                <Icon size={16} className={active ? 'text-brand-gold' : ''} />
                {label}
                {adminOnly && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider text-brand-gold/40 font-medium">
                    admin
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="gold-divider mx-4" />

        {/* User */}
        <div className="px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg bg-brand-card/60 border border-brand-border/50">
            <div className="w-8 h-8 rounded-full bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center text-brand-gold text-sm font-semibold shrink-0">
              {(vendedor?.nome ?? user?.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-text truncate">
                {vendedor?.nome ?? user?.email ?? '—'}
              </p>
              <p className="text-[10px] text-brand-gold/70 capitalize tracking-wider">
                {vendedor?.perfil ?? 'sem perfil'}
              </p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-red-400 hover:bg-red-900/10 transition-all border border-transparent"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-surface/95 backdrop-blur-sm border-t border-brand-border flex items-center justify-around px-2 py-2">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-0
                ${active ? 'text-brand-gold' : 'text-brand-muted hover:text-brand-text-dim'}
              `}
            >
              <Icon size={20} />
              <span className="text-[9px] font-medium tracking-wider uppercase truncate">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

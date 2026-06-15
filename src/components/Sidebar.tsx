'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, Wallet, Receipt, Megaphone, FileBarChart, BarChart2, Menu, X, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes',  label: 'Clientes',  icon: Users },
  { href: '/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/gastos',    label: 'Gastos',    icon: Receipt },
  { href: '/meta',      label: 'Meta Ads',  icon: Megaphone },
  { href: '/analise',   label: 'Análise',   icon: BarChart2 },
  { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
]

export default function Sidebar({ nome, email }: { nome: string; email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">TrafficOS</span>
        <button onClick={() => setOpen(!open)} className="text-gray-600">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 z-50 h-screen w-56 bg-white border-r border-gray-200 flex flex-col transition-transform',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:top-0 pt-14 lg:pt-0'
      )}>
        <div className="hidden lg:flex items-center h-14 px-5 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-900">TrafficOS</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <Avatar nome={nome} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{nome}</p>
              <p className="text-xs text-gray-400 truncate">{email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-red-600 w-full transition-colors"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}

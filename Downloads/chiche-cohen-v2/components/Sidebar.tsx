'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Users, Calendar, Stethoscope, Scale, BarChart3, Settings } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dossiers', label: 'Dossiers', icon: FolderOpen },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/audiences', label: 'Audiences', icon: Calendar },
  { href: '/expertises', label: 'Expertises', icon: Stethoscope },
  { href: '/procedure', label: 'Procédures', icon: Scale },
  { href: '/statistiques', label: 'Statistiques', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-cabinet-blue flex flex-col z-40">
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-white font-bold text-lg">CHICHE COHEN</div>
        <div className="text-blue-200 text-xs mt-0.5">CRM Dommage Corporel</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/parametres" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <Settings size={18} />
          Paramètres
        </Link>
      </div>
    </aside>
  )
}

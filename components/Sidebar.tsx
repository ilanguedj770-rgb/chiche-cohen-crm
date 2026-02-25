'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, FolderOpen, Users, Calendar, Stethoscope, Scale, BarChart3, Bell, Phone, Calculator, Gavel, Briefcase } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [nbAlertes, setNbAlertes] = useState(0)

  useEffect(() => {
    async function loadAlertes() {
      const today = new Date().toISOString().split('T')[0]
      const in15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
      const [dormants, audiences, expertises] = await Promise.all([
        supabase.from('vue_dossiers_a_relancer').select('id', { count: 'exact', head: true }),
        supabase.from('vue_audiences_a_venir').select('id', { count: 'exact', head: true }).lte('date_audience', in15),
        supabase.from('vue_expertises_a_venir').select('id', { count: 'exact', head: true }).lte('date_expertise', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
      ])
      setNbAlertes((dormants.count || 0) + (audiences.count || 0) + (expertises.count || 0))
    }
    loadAlertes()
    const interval = setInterval(loadAlertes, 5 * 60 * 1000) // refresh toutes les 5 min
    return () => clearInterval(interval)
  }, [])

  const nav = [
    { section: 'Principal' },
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/alertes', label: 'Alertes', icon: Bell, badge: nbAlertes },
    { section: 'Dossiers' },
    { href: '/leads', label: 'Leads', icon: Phone },
    { href: '/dossiers', label: 'Dossiers', icon: FolderOpen },
    { href: '/clients', label: 'Clients', icon: Users },
    { section: 'Activité judiciaire' },
    { href: '/audiences', label: 'Audiences', icon: Calendar },
    { href: '/expertises', label: 'Expertises', icon: Stethoscope },
    { href: '/judiciaire', label: 'Suivi judiciaire', icon: Scale },
    { section: 'Outils' },
    { href: '/dintilhac', label: 'Calculateur Dintilhac', icon: Calculator },
    { href: '/procedure', label: 'Procédures', icon: Gavel },
    { href: '/apporteurs', label: 'Apporteurs', icon: Briefcase },
    { section: 'Analyse' },
    { href: '/statistiques', label: 'Statistiques', icon: BarChart3 },
  ]

  return (
    <aside className="fixed top-0 left-0 z-40 w-56 bg-white border-r border-gray-100 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cabinet-blue rounded-lg flex items-center justify-center">
            <Scale size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">Chiche Cohen</div>
            <div className="text-xs text-gray-400">Cabinet d'avocats</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {nav.map((item, i) => {
          if ('section' in item) {
            return <div key={i} className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mt-4 mb-1 first:mt-0">{item.section}</div>
          }
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const badge = (item as any).badge
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-colors text-sm font-medium ${active ? 'bg-cabinet-blue text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                <Icon size={16} className={active ? 'text-white' : 'text-gray-400'} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center ${active ? 'bg-white text-cabinet-blue' : 'bg-red-500 text-white'}`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 text-center">CRM Cabinet v2.0</div>
      </div>
    </aside>
  )
}

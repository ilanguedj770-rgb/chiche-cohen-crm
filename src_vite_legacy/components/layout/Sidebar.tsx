import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  CalendarDays,
  Wallet,
  BookUser,
  Scale,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Dossiers', href: '/dossiers', icon: FolderOpen },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Tâches', href: '/taches', icon: CheckSquare },
  { name: 'Finances', href: '/finances', icon: Wallet },
  { name: 'Contacts', href: '/contacts', icon: BookUser },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-primary-950 text-white flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-primary-800">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Scale className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate">Chiche-Cohen</h1>
            <p className="text-xs text-primary-300 truncate">Dommage Corporel</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-3 py-4 border-t border-primary-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary-300 hover:bg-primary-800 hover:text-white transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  );
}

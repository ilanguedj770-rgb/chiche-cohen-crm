import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  titre: string;
  valeur: string;
  sousTexte?: string;
  icon: LucideIcon;
  couleur: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  tendance?: { valeur: string; positive: boolean };
}

const couleurMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

export default function StatCard({ titre, valeur, sousTexte, icon: Icon, couleur, tendance }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{titre}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{valeur}</p>
          {sousTexte && <p className="mt-1 text-xs text-gray-400">{sousTexte}</p>}
          {tendance && (
            <p className={`mt-1 text-xs font-medium ${tendance.positive ? 'text-green-600' : 'text-red-600'}`}>
              {tendance.positive ? '↑' : '↓'} {tendance.valeur}
            </p>
          )}
        </div>
        <div className={`ml-4 p-3 rounded-xl ${couleurMap[couleur]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

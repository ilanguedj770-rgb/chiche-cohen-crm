import { useMemo } from 'react';
import { Wallet, TrendingUp, Clock, CheckCircle, Euro } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { honoraires, dossiers, clients } from '../data/mockData';
import { formatMontant, formatMontantPrecis, formatDate } from '../utils/format';

const TYPE_HONORAIRE_LABELS: Record<string, string> = {
  forfait: 'Forfait',
  honoraire_resultat: 'Honoraire de résultat',
  consultation: 'Consultation',
  diligence: 'Diligence',
  provision: 'Provision',
};

const STATUT_PAIEMENT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  partiel: 'Partiel',
  paye: 'Payé',
  annule: 'Annulé',
};

const STATUT_PAIEMENT_COLORS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  partiel: 'bg-orange-100 text-orange-800',
  paye: 'bg-green-100 text-green-800',
  annule: 'bg-gray-100 text-gray-500',
};

const getDossier = (dossierId: string) => dossiers.find((d) => d.id === dossierId);
const getClient = (clientId: string) => clients.find((c) => c.id === clientId);

export default function Finances() {
  const totalHT = useMemo(
    () => honoraires.reduce((sum, h) => sum + h.montantHT, 0),
    []
  );

  const totalTTC = useMemo(
    () => honoraires.reduce((sum, h) => sum + h.montantTTC, 0),
    []
  );

  const totalEncaisse = useMemo(
    () =>
      honoraires
        .filter((h) => h.statutPaiement === 'paye')
        .reduce((sum, h) => sum + h.montantTTC, 0),
    []
  );

  const totalEnAttente = useMemo(
    () =>
      honoraires
        .filter(
          (h) =>
            h.statutPaiement === 'en_attente' || h.statutPaiement === 'partiel'
        )
        .reduce((sum, h) => sum + h.montantTTC, 0),
    []
  );

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};

    honoraires.forEach((h) => {
      if (!h.dateFacture) return;
      const date = new Date(h.dateFacture);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + h.montantHT;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mois, montant]) => {
        const [year, month] = mois.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1);
        const label = dateObj.toLocaleDateString('fr-FR', {
          month: 'short',
          year: 'numeric',
        });
        return { mois: label, montant };
      });
  }, []);

  const kpis = [
    {
      label: 'Total Honoraires HT',
      value: formatMontant(totalHT),
      icon: Euro,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total TTC facturé',
      value: formatMontant(totalTTC),
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Encaissé',
      value: formatMontant(totalEncaisse),
      icon: CheckCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'En attente',
      value: formatMontant(totalEnAttente),
      icon: Clock,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-4"
            >
              <div
                className={`flex items-center justify-center h-12 w-12 rounded-full ${kpi.iconBg}`}
              >
                <Icon className={`h-6 w-6 ${kpi.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-xl font-semibold text-gray-900">
                  {kpi.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Honoraires par mois
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatMontant(value)}
              />
              <Tooltip
                formatter={(value) =>
                  `${formatMontantPrecis(value as number)}`
                }
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              />
              <Bar
                dataKey="montant"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Liste des honoraires
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Dossier
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Client
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Type
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Description
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">
                  Montant HT
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">
                  TVA
                </th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">
                  Montant TTC
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Statut paiement
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  Date facture
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {honoraires.map((h) => {
                const dossier = getDossier(h.dossierId);
                const client = dossier
                  ? getClient(dossier.clientId)
                  : undefined;
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {dossier?.reference ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {client?.nom ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {TYPE_HONORAIRE_LABELS[h.type] ?? h.type}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {h.description}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatMontantPrecis(h.montantHT)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {formatMontantPrecis(h.tva)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatMontantPrecis(h.montantTTC)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUT_PAIEMENT_COLORS[h.statutPaiement] ??
                          'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {STATUT_PAIEMENT_LABELS[h.statutPaiement] ??
                          h.statutPaiement}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(h.dateFacture)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FolderOpen,
  Wallet,
  AlertTriangle,
  Scale,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { isBefore, isAfter, startOfDay } from 'date-fns';

import { clients, dossiers, evenements, taches, honoraires } from '../data/mockData';
import {
  type TypeAccident,
  type StatutDossier,
  TYPE_ACCIDENT_LABELS,
  STATUT_DOSSIER_LABELS,
} from '../types';
import { formatDate, formatMontant, formatDateTime } from '../utils/format';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';

const PIE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];

export default function Dashboard() {
  const today = startOfDay(new Date());

  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);

  // --- KPI computations ---

  const dossiersActifs = dossiers.filter(
    (d) => d.statut !== 'archive' && d.statut !== 'cloture_favorable' && d.statut !== 'cloture_defavorable'
  );

  const montantTotalDemande = dossiers.reduce((sum, d) => {
    if (!d.prejudices) return sum;
    return (
      sum +
      d.prejudices.reduce((pSum, p) => pSum + (p.montantDemande ?? 0), 0)
    );
  }, 0);

  const honorairesEncaisses = honoraires
    .filter((h) => h.statutPaiement === 'paye')
    .reduce((sum, h) => sum + h.montantTTC, 0);

  const tachesUrgentes = taches.filter((t) => {
    if (t.statut === 'terminee') return false;
    const isOverdue = t.dateEcheance && isBefore(new Date(t.dateEcheance), today);
    const isUrgent = t.priorite === 'urgente';
    return isOverdue || isUrgent;
  });

  // --- Chart data ---

  const accidentTypeMap = new Map<string, number>();
  dossiers.forEach((d) => {
    const label = TYPE_ACCIDENT_LABELS[d.typeAccident as TypeAccident] ?? d.typeAccident;
    accidentTypeMap.set(label, (accidentTypeMap.get(label) ?? 0) + 1);
  });
  const pieData = Array.from(accidentTypeMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const statutMap = new Map<string, number>();
  dossiers.forEach((d) => {
    const label = STATUT_DOSSIER_LABELS[d.statut as StatutDossier] ?? d.statut;
    statutMap.set(label, (statutMap.get(label) ?? 0) + 1);
  });
  const barData = Array.from(statutMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // --- Upcoming events ---

  const prochainsEvenements = [...evenements]
    .filter((e) => isAfter(new Date(e.dateDebut), today) || new Date(e.dateDebut).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
    .slice(0, 6);

  // --- Priority tasks ---

  const prioriteOrder: Record<string, number> = {
    urgente: 0,
    haute: 1,
    normale: 2,
    basse: 3,
  };

  const tachesPrioritaires = [...taches]
    .filter((t) => t.statut !== 'terminee')
    .sort((a, b) => {
      const pa = prioriteOrder[a.priorite] ?? 99;
      const pb = prioriteOrder[b.priorite] ?? 99;
      if (pa !== pb) return pa - pb;
      if (a.dateEcheance && b.dateEcheance) {
        return new Date(a.dateEcheance).getTime() - new Date(b.dateEcheance).getTime();
      }
      return a.dateEcheance ? -1 : 1;
    })
    .slice(0, 6);

  const prioriteColors: Record<string, string> = {
    urgente: 'text-red-600 bg-red-50',
    haute: 'text-orange-600 bg-orange-50',
    normale: 'text-blue-600 bg-blue-50',
    basse: 'text-gray-600 bg-gray-50',
  };

  const prioriteLabels: Record<string, string> = {
    urgente: 'Urgente',
    haute: 'Haute',
    normale: 'Normale',
    basse: 'Basse',
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d'ensemble de l'activité du cabinet
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titre="Dossiers actifs"
          valeur={String(dossiersActifs.length)}
          sousTexte={`${dossiers.length} dossiers au total`}
          icon={FolderOpen}
          couleur="blue"
        />
        <StatCard
          titre="Montant total demandé"
          valeur={formatMontant(montantTotalDemande)}
          sousTexte="Tous préjudices confondus"
          icon={Scale}
          couleur="purple"
        />
        <StatCard
          titre="Honoraires encaissés"
          valeur={formatMontant(honorairesEncaisses)}
          sousTexte="Honoraires payés"
          icon={Wallet}
          couleur="green"
        />
        <StatCard
          titre="Tâches urgentes"
          valeur={String(tachesUrgentes.length)}
          sousTexte="À traiter en priorité"
          icon={AlertTriangle}
          couleur="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart - Répartition par type d'accident */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Répartition par type d'accident
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={(props) =>
                    `${props.name ?? ''} (${((props.percent ?? 0) * 100).toFixed(0)}%)`
                  }
                >
                  {pieData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Répartition par statut */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Répartition par statut de dossier
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Dossiers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two columns: events + tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prochains événements */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Prochains événements
            </h2>
            <Link
              to="/evenements"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {prochainsEvenements.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">
                Aucun événement à venir
              </p>
            ) : (
              prochainsEvenements.map((evt) => {
                const dossier = dossiers.find((d) => d.id === evt.dossierId);
                const client = dossier ? getClient(dossier.clientId) : undefined;
                return (
                  <div
                    key={evt.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {evt.titre}
                      </p>
                      {client && (
                        <p className="text-sm text-gray-500">
                          {client.prenom} {client.nom}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDateTime(evt.dateDebut)}
                        {evt.lieu ? ` — ${evt.lieu}` : ''}
                      </p>
                    </div>
                    {dossier && (
                      <StatusBadge statut={dossier.statut} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Tâches prioritaires */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tâches prioritaires
            </h2>
            <Link
              to="/taches"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {tachesPrioritaires.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">
                Aucune tâche en cours
              </p>
            ) : (
              tachesPrioritaires.map((tache) => {
                const dossier = dossiers.find((d) => d.id === tache.dossierId);
                const client = dossier ? getClient(dossier.clientId) : undefined;
                const isOverdue =
                  tache.dateEcheance &&
                  isBefore(new Date(tache.dateEcheance), today);

                return (
                  <div
                    key={tache.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isOverdue
                          ? 'bg-red-50 text-red-600'
                          : 'bg-yellow-50 text-yellow-600'
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {tache.titre}
                      </p>
                      {client && (
                        <p className="text-sm text-gray-500">
                          {client.prenom} {client.nom}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            prioriteColors[tache.priorite] ?? 'text-gray-600 bg-gray-50'
                          }`}
                        >
                          {prioriteLabels[tache.priorite] ?? tache.priorite}
                        </span>
                        {tache.dateEcheance && (
                          <span
                            className={`text-xs ${
                              isOverdue ? 'font-semibold text-red-600' : 'text-gray-400'
                            }`}
                          >
                            {isOverdue ? 'En retard — ' : 'Échéance : '}
                            {formatDate(tache.dateEcheance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, FolderOpen } from 'lucide-react';
import { dossiers, clients } from '../data/mockData';
import {
  type StatutDossier,
  type TypeProcedure,
  type TypeAccident,
  STATUT_DOSSIER_LABELS,
  TYPE_PROCEDURE_LABELS,
  TYPE_ACCIDENT_LABELS,
  type Dossier,
} from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate, formatMontant } from '../utils/format';

const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
const getTotalDemande = (dossier: Dossier) =>
  dossier.prejudices.reduce((sum, p) => sum + p.montantDemande, 0);

export default function Dossiers() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  const [search, setSearch] = useState(initialQuery);
  const [statutFilter, setStatutFilter] = useState<StatutDossier | ''>('');
  const [procedureFilter, setProcedureFilter] = useState<TypeProcedure | ''>('');
  const [accidentFilter, setAccidentFilter] = useState<TypeAccident | ''>('');

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((dossier) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const client = getClient(dossier.clientId);
        const clientName = client
          ? `${client.nom} ${client.prenom}`.toLowerCase()
          : '';
        const matchesSearch =
          dossier.reference.toLowerCase().includes(searchLower) ||
          clientName.includes(searchLower) ||
          (dossier.description?.toLowerCase().includes(searchLower) ?? false);
        if (!matchesSearch) return false;
      }

      // Statut filter
      if (statutFilter && dossier.statut !== statutFilter) return false;

      // Procedure filter
      if (procedureFilter && dossier.typeProcedure !== procedureFilter) return false;

      // Accident type filter
      if (accidentFilter && dossier.typeAccident !== accidentFilter) return false;

      return true;
    });
  }, [search, statutFilter, procedureFilter, accidentFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dossiers</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredDossiers.length} dossier{filteredDossiers.length !== 1 ? 's' : ''}{' '}
            {search || statutFilter || procedureFilter || accidentFilter
              ? 'trouvé(s)'
              : 'au total'}
          </p>
        </div>
        <Link
          to="/dossiers/nouveau"
          className="btn-primary inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau dossier
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, client, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
        </div>

        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value as StatutDossier | '')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_DOSSIER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={procedureFilter}
          onChange={(e) => setProcedureFilter(e.target.value as TypeProcedure | '')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Toutes les procédures</option>
          {Object.entries(TYPE_PROCEDURE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={accidentFilter}
          onChange={(e) => setAccidentFilter(e.target.value as TypeAccident | '')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Tous les types d'accident</option>
          {Object.entries(TYPE_ACCIDENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filteredDossiers.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Type d'accident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Procédure
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Date accident
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Montant demandé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Dernière mise à jour
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDossiers.map((dossier, index) => {
                  const client = getClient(dossier.clientId);
                  const totalDemande = getTotalDemande(dossier);
                  return (
                    <tr
                      key={dossier.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-blue-50/50 transition-colors cursor-pointer`}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          to={`/dossiers/${dossier.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {dossier.reference}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {client ? (
                          <span>
                            {client.nom} {client.prenom}
                          </span>
                        ) : (
                          <span className="italic text-gray-400">Client inconnu</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {TYPE_ACCIDENT_LABELS[dossier.typeAccident]}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {TYPE_PROCEDURE_LABELS[dossier.typeProcedure]}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge statut={dossier.statut} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {formatDate(dossier.dateAccident)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {formatMontant(totalDemande)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(dossier.dateMiseAJour)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            Aucun dossier trouvé
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || statutFilter || procedureFilter || accidentFilter
              ? 'Essayez de modifier vos critères de recherche ou vos filtres.'
              : 'Commencez par créer un nouveau dossier.'}
          </p>
          {!search && !statutFilter && !procedureFilter && !accidentFilter && (
            <Link
              to="/dossiers/nouveau"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouveau dossier
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Plus, CheckSquare, Clock, AlertTriangle, FolderOpen, Calendar } from 'lucide-react';
import { parseISO, isBefore, startOfDay } from 'date-fns';
import { taches, dossiers } from '../data/mockData';
import { PRIORITE_LABELS, PRIORITE_COLORS } from '../types';
import { formatDate } from '../utils/format';

const getDossier = (dossierId: string | undefined) =>
  dossierId ? dossiers.find((d) => d.id === dossierId) : undefined;

const isOverdue = (dateStr: string | undefined) => {
  if (!dateStr) return false;
  return isBefore(parseISO(dateStr), startOfDay(new Date()));
};

export default function Taches() {
  const aFaire = taches.filter((t) => t.statut === 'a_faire');
  const enCours = taches.filter((t) => t.statut === 'en_cours');
  const terminees = taches.filter((t) => t.statut === 'terminee');

  const columns = [
    {
      key: 'a_faire',
      title: 'À faire',
      icon: <Clock className="h-5 w-5" />,
      tasks: aFaire,
      headerBg: 'bg-gray-100',
      headerText: 'text-gray-700',
      headerBorder: 'border-gray-300',
      countBg: 'bg-gray-200',
      countText: 'text-gray-600',
      columnBg: 'bg-gray-50/60',
    },
    {
      key: 'en_cours',
      title: 'En cours',
      icon: <AlertTriangle className="h-5 w-5" />,
      tasks: enCours,
      headerBg: 'bg-blue-50',
      headerText: 'text-blue-700',
      headerBorder: 'border-blue-300',
      countBg: 'bg-blue-100',
      countText: 'text-blue-600',
      columnBg: 'bg-blue-50/30',
    },
    {
      key: 'terminee',
      title: 'Terminées',
      icon: <CheckSquare className="h-5 w-5" />,
      tasks: terminees,
      headerBg: 'bg-green-50',
      headerText: 'text-green-700',
      headerBorder: 'border-green-300',
      countBg: 'bg-green-100',
      countText: 'text-green-600',
      columnBg: 'bg-green-50/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
            <p className="text-sm text-gray-500">
              {taches.length} tâche{taches.length > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`${column.columnBg} rounded-xl border border-gray-200 flex flex-col min-h-[500px]`}
          >
            {/* Column Header */}
            <div
              className={`${column.headerBg} ${column.headerText} ${column.headerBorder} border-b rounded-t-xl px-4 py-3 flex items-center justify-between`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {column.icon}
                <span>{column.title}</span>
              </div>
              <span
                className={`${column.countBg} ${column.countText} text-xs font-bold px-2.5 py-1 rounded-full`}
              >
                {column.tasks.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {column.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <CheckSquare className="h-10 w-10 mb-2 opacity-40" />
                  <p className="text-sm">Aucune tâche</p>
                </div>
              ) : (
                column.tasks.map((tache) => {
                  const dossier = getDossier(tache.dossierId);
                  const overdue =
                    tache.statut !== 'terminee' && isOverdue(tache.dateEcheance);
                  const prioriteLabel =
                    PRIORITE_LABELS[tache.priorite] || tache.priorite;
                  const prioriteColor =
                    PRIORITE_COLORS[tache.priorite] || 'bg-gray-100 text-gray-700';

                  return (
                    <div
                      key={tache.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
                    >
                      {/* Priority Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`${prioriteColor} text-xs font-medium px-2 py-0.5 rounded-full`}
                        >
                          {prioriteLabel}
                        </span>
                        {overdue && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            En retard
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        {tache.titre}
                      </h3>

                      {/* Description */}
                      {tache.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                          {tache.description}
                        </p>
                      )}

                      {/* Dossier Reference */}
                      {dossier && (
                        <Link
                          to={`/dossiers/${dossier.id}`}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 mb-3 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span className="truncate font-medium">
                            {dossier.reference}
                          </span>
                        </Link>
                      )}

                      {/* Dates */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        {tache.dateEcheance && (
                          <div
                            className={`flex items-center gap-1 text-xs ${
                              overdue
                                ? 'text-red-600 font-medium'
                                : 'text-gray-400'
                            }`}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(tache.dateEcheance)}</span>
                          </div>
                        )}
                        {!tache.dateEcheance && <div />}
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDate(tache.dateCreation)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Mail, Phone, MapPin, Briefcase, FolderOpen } from 'lucide-react';
import { clients, dossiers } from '../data/mockData';
import { formatDate, getInitials } from '../utils/format';

const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

const getDossierCount = (clientId: string) =>
  dossiers.filter((d) => d.clientId === clientId).length;

export default function Clients() {
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.nom.toLowerCase().includes(term) ||
      c.prenom.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.ville.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filtered.length} client{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/clients/nouveau"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, email, ville…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((client, index) => {
          const colorClass = avatarColors[index % avatarColors.length];
          const initials = getInitials(client.nom, client.prenom);
          const dossierCount = getDossierCount(client.id);

          return (
            <div
              key={client.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colorClass}`}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {client.civilite} {client.nom} {client.prenom}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{client.telephone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <span>{client.ville}</span>
                </div>
                {client.profession && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate">{client.profession}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>Créé le {formatDate(client.dateCreation)}</span>
                  <span className="inline-flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {dossierCount} dossier{dossierCount > 1 ? 's' : ''}
                  </span>
                </div>
                <Link
                  to={`/clients/${client.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Voir le profil
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">Aucun client trouvé.</p>
        </div>
      )}
    </div>
  );
}

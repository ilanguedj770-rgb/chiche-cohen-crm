import { useState, useMemo } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Building2, Shield, Stethoscope, Gavel, UserCog } from 'lucide-react';
import { contacts, dossiers } from '../data/mockData';
import { TYPE_CONTACT_LABELS, type TypeContact } from '../types';

const TYPE_CONTACT_COLORS: Record<TypeContact, string> = {
  assureur: 'bg-blue-100 text-blue-700',
  expert_medical: 'bg-purple-100 text-purple-700',
  avocat_adverse: 'bg-red-100 text-red-700',
  medecin_traitant: 'bg-green-100 text-green-700',
  juridiction: 'bg-amber-100 text-amber-700',
  notaire: 'bg-teal-100 text-teal-700',
  huissier: 'bg-orange-100 text-orange-700',
  expert_judiciaire: 'bg-indigo-100 text-indigo-700',
};

const TYPE_CONTACT_ICONS: Record<TypeContact, any> = {
  assureur: Shield,
  expert_medical: Stethoscope,
  avocat_adverse: Gavel,
  medecin_traitant: Stethoscope,
  juridiction: Building2,
  notaire: UserCog,
  huissier: UserCog,
  expert_judiciaire: Stethoscope,
};

const getDossierCountForContact = (contactId: string) =>
  dossiers.filter(
    (d) =>
      d.assureurId === contactId ||
      d.expertMedicalId === contactId ||
      d.avocatAdverseId === contactId ||
      d.juridictionId === contactId
  ).length;

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<TypeContact | 'all'>('all');

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Type filter
      if (activeTypeFilter !== 'all' && contact.type !== activeTypeFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nom = contact.nom?.toLowerCase() || '';
        const organisme = contact.organisme?.toLowerCase() || '';
        const ville = contact.ville?.toLowerCase() || '';
        return nom.includes(query) || organisme.includes(query) || ville.includes(query);
      }

      return true;
    });
  }, [searchQuery, activeTypeFilter]);

  const typeFilterOptions: { key: TypeContact | 'all'; label: string }[] = [
    { key: 'all', label: 'Tous' },
    ...Object.entries(TYPE_CONTACT_LABELS).map(([key, label]) => ({
      key: key as TypeContact,
      label,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts professionnels</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nouveau contact
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, organisme ou ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex flex-wrap gap-2">
          {typeFilterOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => setActiveTypeFilter(option.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTypeFilter === option.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact cards grid */}
      {filteredContacts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">Aucun contact trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => {
            const TypeIcon = TYPE_CONTACT_ICONS[contact.type] || UserCog;
            const colorClass = TYPE_CONTACT_COLORS[contact.type] || 'bg-gray-100 text-gray-700';
            const dossierCount = getDossierCountForContact(contact.id);

            return (
              <div
                key={contact.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Type badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}
                  >
                    <TypeIcon className="h-3.5 w-3.5" />
                    {TYPE_CONTACT_LABELS[contact.type]}
                  </span>
                  {dossierCount > 0 && (
                    <span className="text-xs text-gray-500">
                      {dossierCount} dossier{dossierCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-base font-semibold text-gray-900">
                  {contact.nom}
                  {contact.prenom ? ` ${contact.prenom}` : ''}
                </h3>

                {/* Organisme */}
                {contact.organisme && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    {contact.organisme}
                  </div>
                )}

                {/* Spécialité */}
                {contact.specialite && (
                  <p className="mt-1 text-sm text-gray-500 italic">{contact.specialite}</p>
                )}

                {/* Contact details */}
                <div className="mt-3 space-y-1.5">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.telephone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{contact.telephone}</span>
                    </div>
                  )}
                  {contact.ville && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{contact.ville}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  Shield,
  Stethoscope,
  FileText,
  Scale,
  Clock,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { dossiers, clients, contacts, evenements } from '../data/mockData';
import {
  TYPE_PROCEDURE_LABELS,
  TYPE_ACCIDENT_LABELS,
  PREJUDICE_LABELS,
  TYPE_CONTACT_LABELS,
} from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate, formatMontant, formatPourcentage } from '../utils/format';

const getClient = (id: string) => clients.find((c) => c.id === id);
const getContact = (id: string) => contacts.find((c) => c.id === id);

const patrimoniaux = ['DSA', 'FD', 'PGPA', 'DSF', 'FLA', 'FVA', 'ATP', 'PGPF', 'IP', 'PSU'];
const extrapatTemporaires = ['DFT', 'SE_T', 'PET', 'PA_T'];
const extrapatPermanents = ['DFP', 'SE_P', 'PEP', 'PA_P', 'PS', 'PE', 'PRE'];

export default function DossierDetail() {
  const { id } = useParams();
  const dossier = dossiers.find((d) => d.id === id);

  if (!dossier) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
        <AlertCircle className="h-16 w-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dossier non trouvé</h1>
        <p className="text-gray-500 mb-6">
          Le dossier avec l'identifiant <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{id}</span> n'existe pas.
        </p>
        <Link
          to="/dossiers"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Link>
      </div>
    );
  }

  const client = getClient(dossier.clientId);
  const assureur = dossier.assureurId ? getContact(dossier.assureurId) : null;
  const avocatAdverse = dossier.avocatAdverseId ? getContact(dossier.avocatAdverseId) : null;
  const expertMedical = dossier.expertMedicalId ? getContact(dossier.expertMedicalId) : null;

  const dossierEvenements = evenements
    .filter((e) => e.dossierId === dossier.id)
    .sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());


  const lastExpertise = dossier.expertises && dossier.expertises.length > 0
    ? dossier.expertises[dossier.expertises.length - 1]
    : null;

  const prejudices = dossier.prejudices || [];

  const renderPrejudiceGroup = (label: string, codes: string[]) => {
    const groupPrejudices = prejudices.filter((p) => codes.includes(p.categorie));
    if (groupPrejudices.length === 0) return null;

    return (
      <>
        <tr>
          <td
            colSpan={4}
            className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200"
          >
            {label}
          </td>
        </tr>
        {groupPrejudices.map((p, idx) => (
          <tr key={`${p.categorie}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="px-4 py-3 text-sm text-gray-900">
              {PREJUDICE_LABELS[p.categorie as keyof typeof PREJUDICE_LABELS] || p.categorie}
              {p.libelle && <span className="block text-xs text-gray-500">{p.libelle}</span>}
            </td>
            <td className="px-4 py-3 text-sm text-right text-gray-700">
              {p.montantDemande != null ? formatMontant(p.montantDemande) : '—'}
            </td>
            <td className="px-4 py-3 text-sm text-right text-gray-700">
              {p.montantOffert != null ? formatMontant(p.montantOffert) : '—'}
            </td>
            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
              {p.montantRetenu != null ? formatMontant(p.montantRetenu) : '—'}
            </td>
          </tr>
        ))}
      </>
    );
  };

  const totalDemande = prejudices.reduce((sum, p) => sum + (p.montantDemande || 0), 0);
  const totalOffre = prejudices.reduce((sum, p) => sum + (p.montantOffert || 0), 0);
  const totalRetenu = prejudices.reduce((sum, p) => sum + (p.montantRetenu || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link + Header */}
        <div className="mb-8">
          <Link
            to="/dossiers"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux dossiers
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{dossier.reference}</h1>
                  <StatusBadge statut={dossier.statut} />
                </div>
                <p className="text-lg text-gray-600 mt-1">
                  {client ? `${client.prenom} ${client.nom}` : 'Client inconnu'}
                </p>
              </div>
            </div>
            <Link
              to={`/dossiers/${dossier.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Link>
          </div>
        </div>

        {/* Info cards row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Informations générales */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Informations générales</h2>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type d'accident</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.typeAccident
                    ? TYPE_ACCIDENT_LABELS[dossier.typeAccident as keyof typeof TYPE_ACCIDENT_LABELS] || dossier.typeAccident
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date de l'accident</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.dateAccident ? formatDate(dossier.dateAccident) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Procédure</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.typeProcedure
                    ? TYPE_PROCEDURE_LABELS[dossier.typeProcedure as keyof typeof TYPE_PROCEDURE_LABELS] || dossier.typeProcedure
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Juridiction</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.juridictionId ? (getContact(dossier.juridictionId)?.nom || '—') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">N° RG</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{dossier.numeroRG || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date de saisine</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.dateSaisine ? formatDate(dossier.dateSaisine) : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Parties */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">Parties</h2>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client</dt>
                <dd className="mt-1">
                  {client ? (
                    <Link
                      to={`/clients/${client.id}`}
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <User className="h-4 w-4" />
                      {client.prenom} {client.nom}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assureur</dt>
                <dd className="mt-1">
                  {assureur ? (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {assureur.prenom} {assureur.nom}
                        </p>
                        {assureur.type && (
                          <p className="text-xs text-gray-500">
                            {TYPE_CONTACT_LABELS[assureur.type as keyof typeof TYPE_CONTACT_LABELS] || assureur.type}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avocat adverse</dt>
                <dd className="mt-1">
                  {avocatAdverse ? (
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {avocatAdverse.prenom} {avocatAdverse.nom}
                        </p>
                        {avocatAdverse.type && (
                          <p className="text-xs text-gray-500">
                            {TYPE_CONTACT_LABELS[avocatAdverse.type as keyof typeof TYPE_CONTACT_LABELS] || avocatAdverse.type}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expert médical</dt>
                <dd className="mt-1">
                  {expertMedical ? (
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-900">
                          {expertMedical.prenom} {expertMedical.nom}
                        </p>
                        {expertMedical.type && (
                          <p className="text-xs text-gray-500">
                            {TYPE_CONTACT_LABELS[expertMedical.type as keyof typeof TYPE_CONTACT_LABELS] || expertMedical.type}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* État médical */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-gray-900">État médical</h2>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date de consolidation</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.dateConsolidation ? formatDate(dossier.dateConsolidation) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux IPP</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dossier.tauxIPP != null ? formatPourcentage(dossier.tauxIPP) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Souffrances endurées</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {lastExpertise && lastExpertise.souffrancesEndures != null
                    ? `${lastExpertise.souffrancesEndures}/7`
                    : '—'}
                </dd>
              </div>
              {lastExpertise && (
                <>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dernière expertise</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {lastExpertise.dateExpertise ? formatDate(lastExpertise.dateExpertise) : '—'}
                    </dd>
                  </div>
                  {lastExpertise.conclusionDFP != null && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">DFP</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatPourcentage(lastExpertise.conclusionDFP)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Main content area: Prejudices + Chronologie */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Nomenclature Dintilhac section */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-semibold text-gray-900">
                  Préjudices — Nomenclature Dintilhac
                </h2>
              </div>

              {prejudices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Poste de préjudice
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Montant demandé
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Offre adverse
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Montant retenu
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderPrejudiceGroup('Préjudices patrimoniaux', patrimoniaux)}
                      {renderPrejudiceGroup('Préjudices extra-patrimoniaux temporaires', extrapatTemporaires)}
                      {renderPrejudiceGroup('Préjudices extra-patrimoniaux permanents', extrapatPermanents)}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                        <td className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {formatMontant(totalDemande)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {formatMontant(totalOffre)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {formatMontant(totalRetenu)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <Scale className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Aucun préjudice enregistré</p>
                </div>
              )}
            </div>
          </div>

          {/* Chronologie sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-900">Chronologie</h2>
              </div>

              <div className="space-y-1">
                {/* Key dates */}
                {dossier.dateAccident && (
                  <div className="flex items-start gap-3 py-2 border-b border-gray-100">
                    <div className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-red-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Accident</p>
                      <p className="text-sm text-gray-900">{formatDate(dossier.dateAccident)}</p>
                    </div>
                  </div>
                )}
                {dossier.dateCreation && (
                  <div className="flex items-start gap-3 py-2 border-b border-gray-100">
                    <div className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Ouverture dossier</p>
                      <p className="text-sm text-gray-900">{formatDate(dossier.dateCreation)}</p>
                    </div>
                  </div>
                )}
                {dossier.dateSaisine && (
                  <div className="flex items-start gap-3 py-2 border-b border-gray-100">
                    <div className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Saisine</p>
                      <p className="text-sm text-gray-900">{formatDate(dossier.dateSaisine)}</p>
                    </div>
                  </div>
                )}
                {dossier.dateConsolidation && (
                  <div className="flex items-start gap-3 py-2 border-b border-gray-100">
                    <div className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Consolidation</p>
                      <p className="text-sm text-gray-900">{formatDate(dossier.dateConsolidation)}</p>
                    </div>
                  </div>
                )}

                {/* Events from evenements */}
                {dossierEvenements.slice(0, 8).map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 py-2 border-b border-gray-100">
                    <div className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-gray-300" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">{formatDate(evt.dateDebut)}</p>
                      <p className="text-sm text-gray-900 line-clamp-2">{evt.titre || evt.description}</p>
                    </div>
                  </div>
                ))}

                {dossierEvenements.length === 0 &&
                  !dossier.dateAccident &&
                  !dossier.dateCreation &&
                  !dossier.dateSaisine &&
                  !dossier.dateConsolidation && (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun événement</p>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Expertises médicales section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">Expertises médicales</h2>
          </div>

          {dossier.expertises && dossier.expertises.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dossier.expertises.map((expertise, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">
                      Expertise {idx + 1}
                    </span>
                    {expertise.dateExpertise && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(expertise.dateExpertise)}
                      </span>
                    )}
                  </div>

                  <dl className="space-y-2">
                    {expertise.expertId && (
                      <div>
                        <dt className="text-xs text-gray-500">Expert</dt>
                        <dd className="text-sm text-gray-900">{getContact(expertise.expertId)?.nom || expertise.expertId}</dd>
                      </div>
                    )}
                    {expertise.type && (
                      <div>
                        <dt className="text-xs text-gray-500">Type</dt>
                        <dd className="text-sm text-gray-900">{expertise.type}</dd>
                      </div>
                    )}
                    {expertise.lieu && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <dd className="text-sm text-gray-700">{expertise.lieu}</dd>
                      </div>
                    )}
                    {expertise.conclusionDFP != null && (
                      <div>
                        <dt className="text-xs text-gray-500">DFP</dt>
                        <dd className="text-sm text-gray-900">{formatPourcentage(expertise.conclusionDFP)}</dd>
                      </div>
                    )}
                    {expertise.souffrancesEndures != null && (
                      <div>
                        <dt className="text-xs text-gray-500">Souffrances endurées</dt>
                        <dd className="text-sm text-gray-900">{expertise.souffrancesEndures}/7</dd>
                      </div>
                    )}
                    {expertise.conclusionDFT != null && (
                      <div>
                        <dt className="text-xs text-gray-500">DFT</dt>
                        <dd className="text-sm text-gray-900">{expertise.conclusionDFT}</dd>
                      </div>
                    )}
                    {expertise.notes && (
                      <div>
                        <dt className="text-xs text-gray-500">Notes</dt>
                        <dd className="text-sm text-gray-700 mt-1 line-clamp-3">
                          {expertise.notes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-12 text-center">
              <Stethoscope className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucune expertise médicale enregistrée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

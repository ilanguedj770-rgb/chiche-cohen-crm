import { STATUT_DOSSIER_LABELS, STATUT_DOSSIER_COLORS, type StatutDossier } from '../../types';

interface StatusBadgeProps {
  statut: StatutDossier;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ statut, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${STATUT_DOSSIER_COLORS[statut]}`}>
      {STATUT_DOSSIER_LABELS[statut]}
    </span>
  );
}

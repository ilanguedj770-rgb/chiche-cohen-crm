import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '-';
  return format(date, 'dd/MM/yyyy', { locale: fr });
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '-';
  return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
}

export function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  const date = parseISO(dateStr);
  if (!isValid(date)) return '-';
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export function formatMontant(montant: number | undefined): string {
  if (montant === undefined || montant === null) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

export function formatMontantPrecis(montant: number | undefined): string {
  if (montant === undefined || montant === null) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(montant);
}

export function formatTelephone(tel: string | undefined): string {
  if (!tel) return '-';
  return tel;
}

export function getInitials(nom: string, prenom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function formatPourcentage(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  return `${value} %`;
}

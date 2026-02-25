import { useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Clock,
  Gavel,
  Stethoscope,
  Users,
  AlertTriangle,
  Bell,
  BookOpen,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  parseISO,
  isAfter,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { evenements, dossiers } from '../data/mockData';
import { formatDateTime, formatDate } from '../utils/format';
import { PRIORITE_LABELS, PRIORITE_COLORS } from '../types';

const TYPE_EVENEMENT_ICONS: Record<string, any> = {
  audience: Gavel,
  expertise: Stethoscope,
  rdv_client: Users,
  rdv_adverse: Users,
  echeance: AlertTriangle,
  relance: Bell,
  conference: BookOpen,
  autre: Calendar,
};

const TYPE_EVENEMENT_COLORS: Record<string, string> = {
  audience: 'bg-red-100 text-red-600',
  expertise: 'bg-purple-100 text-purple-600',
  rdv_client: 'bg-blue-100 text-blue-600',
  rdv_adverse: 'bg-orange-100 text-orange-600',
  echeance: 'bg-yellow-100 text-yellow-600',
  relance: 'bg-teal-100 text-teal-600',
  conference: 'bg-indigo-100 text-indigo-600',
  autre: 'bg-gray-100 text-gray-600',
};

const TYPE_EVENEMENT_LABELS: Record<string, string> = {
  audience: 'Audience',
  expertise: 'Expertise',
  rdv_client: 'RDV Client',
  rdv_adverse: 'RDV Partie adverse',
  echeance: 'Échéance',
  relance: 'Relance',
  conference: 'Conférence',
  autre: 'Autre',
};

const getDossier = (dossierId: string | undefined) =>
  dossierId ? dossiers.find((d) => d.id === dossierId) : undefined;

const getEventsForDay = (day: Date) =>
  evenements.filter((e) => isSameDay(parseISO(e.dateDebut), day));

export default function Agenda() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // French calendar starts on Monday (1=Mon ... 7=Sun)
  // getDay returns 0=Sun, 1=Mon ... 6=Sat
  // Convert so Monday=0, Sunday=6
  const startDayOfWeek = (getDay(monthStart) + 6) % 7;

  // Padding days before the first day of the month
  const paddingBefore = Array.from({ length: startDayOfWeek }, (_, i) => {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - (startDayOfWeek - i));
    return day;
  });

  // Padding days after the last day of the month to fill the grid
  const totalCells = paddingBefore.length + daysInMonth.length;
  const paddingAfterCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const paddingAfter = Array.from({ length: paddingAfterCount }, (_, i) => {
    const day = new Date(monthEnd);
    day.setDate(day.getDate() + i + 1);
    return day;
  });

  const allCalendarDays = [...paddingBefore, ...daysInMonth, ...paddingAfter];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Events to display in the list
  const displayedEvents = selectedDay
    ? getEventsForDay(selectedDay).sort(
        (a, b) =>
          parseISO(a.dateDebut).getTime() - parseISO(b.dateDebut).getTime()
      )
    : evenements
        .filter((e) => isAfter(parseISO(e.dateDebut), startOfDay(today)) || isSameDay(parseISO(e.dateDebut), today))
        .sort(
          (a, b) =>
            parseISO(a.dateDebut).getTime() - parseISO(b.dateDebut).getTime()
        );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Nouvel événement
        </button>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {allCalendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const dayEvents = getEventsForDay(day);
              const hasEvents = dayEvents.length > 0;

              // Collect unique event type colors for dots
              const eventTypesOnDay = [
                ...new Set(dayEvents.map((e) => e.type)),
              ];

              return (
                <button
                  key={index}
                  onClick={() =>
                    setSelectedDay(
                      isSelected ? null : day
                    )
                  }
                  className={`
                    relative flex flex-col items-center justify-start py-2 min-h-[60px] text-sm transition-colors
                    ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-50'}
                    ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 rounded-lg' : ''}
                    ${isToday && !isSelected ? 'ring-2 ring-blue-500 ring-inset rounded-lg' : ''}
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${isSelected ? 'text-white' : ''}
                      ${isToday && !isSelected ? 'text-blue-600 font-bold' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {eventTypesOnDay.slice(0, 3).map((type, i) => {
                        const colorClass = TYPE_EVENEMENT_COLORS[type] || TYPE_EVENEMENT_COLORS.autre;
                        const dotColor = colorClass.split(' ')[1] || 'text-gray-400';
                        return (
                          <span
                            key={i}
                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                              isSelected
                                ? 'bg-white'
                                : dotColor.replace('text-', 'bg-')
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedDay
            ? `Événements du ${formatDate(selectedDay.toISOString())}`
            : 'Événements à venir'}
        </h3>

        {displayedEvents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Calendar className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {selectedDay
                ? 'Aucun événement pour cette journée'
                : 'Aucun événement à venir'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedEvents.map((event) => {
              const Icon =
                TYPE_EVENEMENT_ICONS[event.type] || TYPE_EVENEMENT_ICONS.autre;
              const colorClass =
                TYPE_EVENEMENT_COLORS[event.type] || TYPE_EVENEMENT_COLORS.autre;
              const typeLabel =
                TYPE_EVENEMENT_LABELS[event.type] || TYPE_EVENEMENT_LABELS.autre;
              const dossier = getDossier(event.dossierId);
              const prioriteLabel =
                PRIORITE_LABELS[event.priorite as keyof typeof PRIORITE_LABELS];
              const prioriteColor =
                PRIORITE_COLORS[event.priorite as keyof typeof PRIORITE_COLORS];

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Type icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Event details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {event.titre}
                        </h4>
                        <span className="text-xs text-gray-500">{typeLabel}</span>
                      </div>
                      {prioriteLabel && (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${prioriteColor || 'bg-gray-100 text-gray-600'}`}
                        >
                          {prioriteLabel}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(event.dateDebut)}
                      </span>
                      {event.lieu && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.lieu}
                        </span>
                      )}
                      {dossier && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {dossier.reference}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

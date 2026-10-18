"use client";

import { useEffect, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  AlertTriangle,
  Coffee,
  ExternalLink,
  RefreshCw,
  Link2,
} from "lucide-react";
import type { AgendaTimelineData, CalendarEvent, FreeBlock } from "@/lib/google/calendar";

export function AgendaTimeline() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [agenda, setAgenda] = useState<AgendaTimelineData | null>(null);

  const fetchAgenda = async (date: Date) => {
    try {
      setLoading(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/calendar/events?date=${dateStr}`);
      const data = await res.json();

      if (data.connected === false && !data.agenda) {
        setConnected(false);
        setAgenda(null);
      } else {
        setConnected(true);
        setAgenda(data.agenda || null);
      }
    } catch (err) {
      console.error("Error loading agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgenda(selectedDate);
  }, [selectedDate]);

  // Lista de 7 días (Hoy + 6 días)
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Combinar eventos y bloques libres en una sola línea de tiempo ordenada
  type TimelineItem =
    | { type: "event"; data: CalendarEvent }
    | { type: "free"; data: FreeBlock };

  const timelineItems: TimelineItem[] = [];

  if (agenda) {
    agenda.events.forEach((ev) => timelineItems.push({ type: "event", data: ev }));
    agenda.freeBlocks.forEach((fb) => timelineItems.push({ type: "free", data: fb }));

    timelineItems.sort((a, b) => {
      const timeA = new Date(a.data.start).getTime();
      const timeB = new Date(b.data.start).getTime();
      return timeA - timeB;
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Agenda</h2>
            <p className="text-xs text-muted-foreground">
              {agenda ? `${agenda.events.length} reuniones programadas` : "Línea de tiempo"}
            </p>
          </div>
        </div>

        {connected && (
          <button
            onClick={() => fetchAgenda(selectedDate)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        )}
      </div>

      {/* Selector de 7 días */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {next7Days.map((d, index) => {
          const isSelected =
            format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          const dayName = format(d, "EEE", { locale: es });
          const dayNum = format(d, "d");

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(d)}
              className={`flex min-w-[3.5rem] flex-1 flex-col items-center rounded-lg border py-2 px-1 text-xs transition-colors ${
                isSelected
                  ? "border-foreground bg-foreground text-background font-semibold"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span className="capitalize text-[10px]">{index === 0 ? "Hoy" : dayName}</span>
              <span className="text-sm font-semibold">{dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Estado: No conectado a Google */}
      {connected === false && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 px-4 text-center">
          <Link2 className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-medium text-foreground">
            Google Calendar no conectado
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Conecta tu cuenta de Google con permisos de solo lectura para sincronizar tu agenda.
          </p>
          <a
            href="/api/auth/google"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:opacity-90"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Conectar Google Calendar</span>
          </a>
        </div>
      )}

      {/* Estado: Cargando */}
      {connected !== false && loading && (
        <div className="mt-6 flex items-center justify-center py-12 text-xs text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Cargando agenda...
        </div>
      )}

      {/* Estado: Lista de Eventos y Bloques Libres */}
      {connected !== false && !loading && timelineItems.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
          <Coffee className="h-6 w-6 mb-2 opacity-50" />
          <span>No hay reuniones programadas para este día.</span>
        </div>
      )}

      {connected !== false && !loading && timelineItems.length > 0 && (
        <div className="mt-6 space-y-2.5">
          {timelineItems.map((item, idx) => {
            if (item.type === "free") {
              return (
                <div
                  key={`free-${idx}`}
                  className="flex items-center justify-between rounded-lg border border-dashed border-border bg-secondary/30 px-3.5 py-2 text-xs text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="h-3.5 w-3.5" />
                    <span>
                      Tiempo disponible ({item.data.durationMinutes} min)
                    </span>
                  </div>
                  <span className="font-mono text-[11px]">
                    {item.data.startTimeFormatted} - {item.data.endTimeFormatted}
                  </span>
                </div>
              );
            }

            const ev = item.data;
            return (
              <div
                key={`ev-${ev.id}-${idx}`}
                className={`relative rounded-lg border p-3.5 transition-colors ${
                  ev.hasConflict
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border bg-secondary/50 hover:bg-secondary/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {ev.startTimeFormatted} - {ev.endTimeFormatted}
                      </span>
                      <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {ev.durationMinutes} min
                      </span>
                      {ev.hasConflict && (
                        <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Conflicto de horario
                        </span>
                      )}
                      {ev.hasTightBuffer && !ev.hasConflict && (
                        <span className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          &lt;15m pausa
                        </span>
                      )}
                    </div>

                    <h4 className="mt-1 text-sm font-medium text-foreground truncate">
                      {ev.title}
                    </h4>

                    {ev.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  {ev.videoLink && (
                    <a
                      href={ev.videoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      title="Unirse a videollamada"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Unirse</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

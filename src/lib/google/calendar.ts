import { google, calendar_v3 } from "googleapis";
import { getAuthenticatedGoogleClient } from "./client";
import {
  parseISO,
  differenceInMinutes,
  isBefore,
  isAfter,
  addMinutes,
  format,
  startOfDay,
  endOfDay,
} from "date-fns";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO
  end: string; // ISO
  startTimeFormatted: string; // "09:00"
  endTimeFormatted: string; // "10:00"
  durationMinutes: number;
  videoLink?: string;
  location?: string;
  hasConflict?: boolean;
  conflictWithTitle?: string;
  hasTightBuffer?: boolean; // < 15 min de separación con el siguiente o previo
}

export interface FreeBlock {
  start: string; // ISO
  end: string; // ISO
  startTimeFormatted: string;
  endTimeFormatted: string;
  durationMinutes: number;
}

export interface AgendaTimelineData {
  date: string; // "YYYY-MM-DD"
  events: CalendarEvent[];
  freeBlocks: FreeBlock[];
  totalMeetingMinutes: number;
  totalFreeMinutes: number;
}

/**
 * Extrae enlace de videollamada desde conferenceData, hangoutLink o descripción/ubicación
 */
function extractVideoLink(item: calendar_v3.Schema$Event): string | undefined {
  if (item.hangoutLink) return item.hangoutLink;
  if (item.conferenceData?.entryPoints) {
    const videoEntry = item.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === "video" && ep.uri
    );
    if (videoEntry?.uri) return videoEntry.uri;
  }

  // Buscar enlaces de Zoom, Google Meet o Teams en descripción o ubicación
  const textToScan = `${item.location || ""} ${item.description || ""}`;
  const meetRegex = /(https?:\/\/(meet\.google\.com|[\w-]+\.zoom\.us\/[j|s]\/|teams\.microsoft\.com\/l\/meetup-join\/)[\w\-\.\?=\/&#%+]+)/i;
  const match = textToScan.match(meetRegex);
  return match ? match[0] : undefined;
}

/**
 * Obtiene los eventos para un día específico y calcula conflictos, pausas cortas y bloques disponibles
 */
export async function getDayAgenda(
  userId: string,
  targetDateStr: string, // YYYY-MM-DD
  timeZone = "America/Mexico_City",
  useAdmin = false
): Promise<AgendaTimelineData> {
  const oauth2Client = await getAuthenticatedGoogleClient(userId, useAdmin);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // Crear rango del día en cuestión
  const targetDate = new Date(`${targetDateStr}T00:00:00`);
  const dayStart = startOfDay(targetDate).toISOString();
  const dayEnd = endOfDay(targetDate).toISOString();

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: dayStart,
    timeMax: dayEnd,
    singleEvents: true,
    orderBy: "startTime",
    timeZone,
  });

  const rawItems = response.data.items || [];

  // Filtrar eventos con hora de inicio/fin válida (excluyendo eventos de todo el día para la línea horaria o marcándolos)
  const timedItems = rawItems.filter(
    (item) => item.start?.dateTime && item.end?.dateTime
  );

  const events: CalendarEvent[] = timedItems.map((item) => {
    const startIso = item.start!.dateTime!;
    const endIso = item.end!.dateTime!;
    const startDate = parseISO(startIso);
    const endDate = parseISO(endIso);
    const duration = Math.max(0, differenceInMinutes(endDate, startDate));

    return {
      id: item.id || Math.random().toString(),
      title: item.summary || "(Sin título)",
      description: item.description || undefined,
      start: startIso,
      end: endIso,
      startTimeFormatted: format(startDate, "HH:mm"),
      endTimeFormatted: format(endDate, "HH:mm"),
      durationMinutes: duration,
      videoLink: extractVideoLink(item),
      location: item.location || undefined,
    };
  });

  // 1. Detectar conflictos (solapamientos) y pausas de menos de 15 minutos
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const currentStart = parseISO(current.start);
    const currentEnd = parseISO(current.end);

    for (let j = 0; j < events.length; j++) {
      if (i === j) continue;
      const other = events[j];
      const otherStart = parseISO(other.start);
      const otherEnd = parseISO(other.end);

      // Solapamiento: currentStart < otherEnd AND otherStart < currentEnd
      if (isBefore(currentStart, otherEnd) && isBefore(otherStart, currentEnd)) {
        current.hasConflict = true;
        current.conflictWithTitle = other.title;
      }
    }

    // Comprobar cercanía con el siguiente evento (< 15 min)
    if (i < events.length - 1) {
      const next = events[i + 1];
      const nextStart = parseISO(next.start);
      const gap = differenceInMinutes(nextStart, currentEnd);

      if (gap >= 0 && gap < 15) {
        current.hasTightBuffer = true;
        next.hasTightBuffer = true;
      }
    }
  }

  // 2. Calcular bloques libres de más de 45 minutos dentro de la jornada estándar (08:30 a 19:30 o en base a eventos)
  const freeBlocks: FreeBlock[] = [];
  const workDayStart = new Date(`${targetDateStr}T08:30:00`);
  const workDayEnd = new Date(`${targetDateStr}T19:30:00`);

  let cursor = workDayStart;

  for (const ev of events) {
    const evStart = parseISO(ev.start);
    const evEnd = parseISO(ev.end);

    if (isAfter(evStart, cursor)) {
      const gap = differenceInMinutes(evStart, cursor);
      if (gap >= 45) {
        freeBlocks.push({
          start: cursor.toISOString(),
          end: evStart.toISOString(),
          startTimeFormatted: format(cursor, "HH:mm"),
          endTimeFormatted: format(evStart, "HH:mm"),
          durationMinutes: gap,
        });
      }
    }

    if (isAfter(evEnd, cursor)) {
      cursor = evEnd;
    }
  }

  // Hueco final después del último evento hasta el fin de la jornada
  if (isBefore(cursor, workDayEnd)) {
    const finalGap = differenceInMinutes(workDayEnd, cursor);
    if (finalGap >= 45) {
      freeBlocks.push({
        start: cursor.toISOString(),
        end: workDayEnd.toISOString(),
        startTimeFormatted: format(cursor, "HH:mm"),
        endTimeFormatted: format(workDayEnd, "HH:mm"),
        durationMinutes: finalGap,
      });
    }
  }

  const totalMeetingMinutes = events.reduce((acc, ev) => acc + ev.durationMinutes, 0);
  const totalFreeMinutes = freeBlocks.reduce((acc, fb) => acc + fb.durationMinutes, 0);

  return {
    date: targetDateStr,
    events,
    freeBlocks,
    totalMeetingMinutes,
    totalFreeMinutes,
  };
}

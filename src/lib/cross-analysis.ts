import { format, isSameDay, parseISO } from "date-fns";
import type { CalendarEvent, FreeBlock } from "./google/calendar";
import type { ClassifiedEmailView } from "@/app/api/emails/sync/route";

export interface TaskItem {
  id: string;
  titulo: string;
  descripcion?: string | null;
  fecha_limite?: string | null;
  prioridad: "alta" | "media" | "baja";
  estado: "pendiente" | "en_progreso" | "hecha";
  proyecto?: string | null;
}

export interface CrossAlert {
  id: string;
  tipo: "email_missing_event" | "meeting_no_details" | "task_insufficient_time" | "overloaded_day";
  severidad: "advertencia" | "info";
  titulo: string;
  descripcion: string;
  accionTexto?: string;
  accionUrl?: string;
}

export interface CrossAnalysisResult {
  hoyEnUnaLinea: string;
  alertas: CrossAlert[];
  totalReunionesHoy: number;
  totalMinutosReunion: number;
  totalMinutosLibres: number;
  tareaPrincipal?: TaskItem;
}

export function computeCrossAnalysis({
  todayDate = new Date(),
  events = [],
  freeBlocks = [],
  emails = [],
  tasks = [],
}: {
  todayDate?: Date;
  events: CalendarEvent[];
  freeBlocks: FreeBlock[];
  emails: ClassifiedEmailView[];
  tasks: TaskItem[];
}): CrossAnalysisResult {
  const alertas: CrossAlert[] = [];

  // 1. Horas de reuniones y tiempo libre de hoy
  const todayStr = format(todayDate, "yyyy-MM-dd");
  const todayEvents = events.filter((e) => {
    try {
      return isSameDay(parseISO(e.start), todayDate);
    } catch {
      return false;
    }
  });

  const totalMinutosReunion = todayEvents.reduce((acc, ev) => acc + ev.durationMinutes, 0);
  const totalMinutosLibres = freeBlocks.reduce((acc, fb) => acc + fb.durationMinutes, 0);

  // Alerta: Días de la semana con más de 6 horas de reuniones (360 minutos)
  if (totalMinutosReunion >= 360) {
    const horasReunion = (totalMinutosReunion / 60).toFixed(1);
    alertas.push({
      id: "overloaded_day",
      tipo: "overloaded_day",
      severidad: "advertencia",
      titulo: "Sobrecarga de reuniones detectada",
      descripcion: `Tienes programadas ${horasReunion} horas de reuniones hoy (más de 6h). Considera delegar o reagendar bloques no críticos.`,
    });
  }

  // Alerta: Reuniones de hoy sin enlace de videollamada ni descripción
  todayEvents.forEach((ev) => {
    const hasDescription = ev.description && ev.description.trim().length > 0;
    const hasLocation = ev.location && ev.location.trim().length > 0;
    const hasVideo = !!ev.videoLink;

    if (!hasVideo && !hasDescription && !hasLocation) {
      alertas.push({
        id: `meeting-no-details-${ev.id}`,
        tipo: "meeting_no_details",
        severidad: "info",
        titulo: `Reunión sin detalles: "${ev.title}"`,
        descripcion: `La reunión a las ${ev.startTimeFormatted} no tiene enlace de videollamada, descripción ni ubicación establecida.`,
      });
    }
  });

  // Alerta: Correos con una fecha o reunión que no existe en el calendario
  const emailsConFecha = emails.filter((em) => em.fechaLimiteDetectada);
  emailsConFecha.forEach((em) => {
    const detectedDateStr = em.fechaLimiteDetectada!;
    // Verificar si en el calendario existe un evento en esa fecha
    const matchingEvent = events.some((ev) => {
      try {
        const evDateStr = format(parseISO(ev.start), "yyyy-MM-dd");
        return evDateStr === detectedDateStr;
      } catch {
        return false;
      }
    });

    if (!matchingEvent) {
      alertas.push({
        id: `email-missing-event-${em.threadId}`,
        tipo: "email_missing_event",
        severidad: "advertencia",
        titulo: `Compromiso detectado en correo sin evento en agenda`,
        descripcion: `El correo "${em.subject}" de ${em.from} menciona la fecha ${detectedDateStr}, pero no tienes ningún evento agendado para ese día.`,
        accionTexto: "Ver correo",
        accionUrl: em.gmailUrl,
      });
    }
  });

  // Tareas pendientes que vencen hoy
  const tasksDueToday = tasks.filter((t) => {
    if (t.estado === "hecha") return false;
    if (!t.fecha_limite) return false;
    try {
      return isSameDay(parseISO(t.fecha_limite), todayDate);
    } catch {
      return false;
    }
  });

  // Alerta: Tareas que vencen hoy sin tiempo libre suficiente en la agenda
  // Si hay tareas de hoy y el tiempo libre es menor a 45 min por cada tarea pendiente
  const minutosRequeridosEstimados = tasksDueToday.length * 45;
  if (tasksDueToday.length > 0 && totalMinutosLibres < minutosRequeridosEstimados) {
    const horasLibres = Math.floor(totalMinutosLibres / 60);
    const minLibres = totalMinutosLibres % 60;
    alertas.push({
      id: "task-insufficient-time",
      tipo: "task_insufficient_time",
      severidad: "advertencia",
      titulo: "Tiempo libre insuficiente para tareas de hoy",
      descripcion: `Tienes ${tasksDueToday.length} tarea(s) que vencen hoy, pero solo dispones de ${horasLibres > 0 ? `${horasLibres}h ` : ""}${minLibres}m de tiempo libre en tu agenda.`,
    });
  }

  // Tarea más importante (Prioridad alta pendiente, o la más próxima de hoy)
  const pendingTasks = tasks.filter((t) => t.estado !== "hecha");
  const tareaPrincipal =
    pendingTasks.find((t) => t.prioridad === "alta") ||
    tasksDueToday[0] ||
    pendingTasks[0];

  // Construir frase "Hoy en una línea"
  const horasReunionFormat = (totalMinutosReunion / 60).toFixed(1).replace(".0", "");
  const horasLibresFormat = (totalMinutosLibres / 60).toFixed(1).replace(".0", "");

  let hoyEnUnaLinea = `Hoy tienes ${todayEvents.length} ${
    todayEvents.length === 1 ? "reunión" : "reuniones"
  } (${horasReunionFormat}h), ${horasLibresFormat}h de tiempo disponible`;

  if (tareaPrincipal) {
    hoyEnUnaLinea += ` y tu prioridad clave es "${tareaPrincipal.titulo}".`;
  } else {
    hoyEnUnaLinea += ` y tu lista de tareas clave está despejada.`;
  }

  return {
    hoyEnUnaLinea,
    alertas,
    totalReunionesHoy: todayEvents.length,
    totalMinutosReunion,
    totalMinutosLibres,
    tareaPrincipal,
  };
}

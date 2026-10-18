import { getAnthropicClient, getAnthropicModel } from "./client";
import type { AgendaTimelineData } from "../google/calendar";
import type { ClassifiedEmailView } from "@/app/api/emails/sync/route";
import type { TaskItem, CrossAlert } from "../cross-analysis";

export async function generateDailyBriefMarkdown({
  dateFormatted,
  agenda,
  emails,
  tasks,
  alerts,
}: {
  dateFormatted: string;
  agenda: AgendaTimelineData;
  emails: ClassifiedEmailView[];
  tasks: TaskItem[];
  alerts: CrossAlert[];
}): Promise<string> {
  const anthropic = getAnthropicClient();
  const model = getAnthropicModel();

  // Filtrar max 5 de responder hoy
  const priorityEmails = emails
    .filter((e) => e.categoria === "responder_hoy")
    .slice(0, 5)
    .map((e) => ({
      de: e.from,
      asunto: e.subject,
      resumen: e.resumenUnaLinea,
      plazo: e.fechaLimiteDetectada,
      url: e.gmailUrl,
    }));

  const eventsSummary = agenda.events.map((e) => ({
    horario: `${e.startTimeFormatted} - ${e.endTimeFormatted}`,
    titulo: e.title,
    duracion: `${e.durationMinutes} min`,
    videoLink: e.videoLink || null,
    conflicto: e.hasConflict ? e.conflictWithTitle : null,
  }));

  const pendingTasks = tasks
    .filter((t) => t.estado !== "hecha")
    .map((t) => ({
      titulo: t.titulo,
      prioridad: t.prioridad,
      fecha_limite: t.fecha_limite,
      proyecto: t.proyecto,
    }));

  const alertsSummary = alerts.map((a) => ({
    titulo: a.titulo,
    descripcion: a.descripcion,
  }));

  const prompt = `Eres el asistente ejecutivo de productividad personal para "Panel de Vida".
Redacta el Resumen Matutino para el día de hoy (${dateFormatted}).

DATOS DEL DÍA:
- Agenda (${agenda.events.length} reuniones, ${(agenda.totalMeetingMinutes / 60).toFixed(1)}h total, ${(agenda.totalFreeMinutes / 60).toFixed(1)}h tiempo libre):
${JSON.stringify(eventsSummary, null, 2)}

- Correos prioritarios a responder hoy (máximo 5):
${JSON.stringify(priorityEmails, null, 2)}

- Tareas pendientes:
${JSON.stringify(pendingTasks, null, 2)}

- Alertas e inconsistencias cruzadas:
${JSON.stringify(alertsSummary, null, 2)}

INSTRUCCIONES Y ESTRUCTURA OBLIGATORIA:
El resumen debe poder leerse en menos de 90 segundos. Sé directo, conciso, elegante y profesional en español.
Usa exactamente estas secciones en formato Markdown:

## 1. Tres Prioridades Clave de Hoy
(Enumera exactamente 3 prioridades del día especificando el motivo por el cual importan hoy, seleccionadas entre tus tareas clave, reuniones críticas o correos urgentes).

## 2. Agenda Resumida
(Línea temporal concisa con horarios y reuniones clave; menciona los bloques de tiempo libre disponibles).

## 3. Correos a Responder Hoy (Máx 5)
(Lista de los correos clave con remitente y la acción puntual esperada en un renglón).

## 4. Alertas y Puntos de Atención
(Menciona solapamientos, reuniones sin link o compromisos pendientes; si no hay alertas, escribe una sola frase confirmándolo).

## 5. Sugerencia de Organización
(Una recomendación concreta para proteger tu concentración o reorganizar el día si hay sobrecarga o pausas muy cortas).`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1500,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
